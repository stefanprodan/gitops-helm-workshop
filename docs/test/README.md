---
title: Canary Helm Tests
---

# Helm Tests

Flagger comes with a testing service that can run Helm tests when configured as a webhook.

## Create tests

Create a test for the podinfo token API:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: {{ template "podinfo.fullname" . }}-jwt-test-{{ randAlphaNum 5 | lower }}
  labels:
    heritage: {{ .Release.Service }}
    release: {{ .Release.Name }}
    chart: {{ .Chart.Name }}-{{ .Chart.Version }}
    app: {{ template "podinfo.name" . }}
  annotations:
    "helm.sh/hook": test-success
spec:
  containers:
    - name: tools
      image: giantswarm/tiny-tools
      command: ["/bin/sh", "/scripts/test.sh"]
      env:
      - name: PODINFO_SVC
        value: {{ template "podinfo.fullname" . }}:{{ .Values.service.externalPort }}
      volumeMounts:
      - name: scripts
        mountPath: /scripts
  restartPolicy: Never
  volumes:
  - name: scripts
    configMap:
      name: {{ template "podinfo.fullname" . }}-test-cfg
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ template "podinfo.fullname" . }}-test-cfg
  labels:
    heritage: {{ .Release.Service }}
    release: {{ .Release.Name }}
    chart: {{ .Chart.Name }}-{{ .Chart.Version }}
    app: {{ template "podinfo.name" . }}
data:
  test.sh: |
    #!/bin/sh
    echo "testing ${PODINFO_SVC}/token"
    TOKEN=$(curl -sd 'test' ${PODINFO_SVC}/token | jq -r .token) && \
    curl -H "Authorization: Bearer ${TOKEN}" ${PODINFO_SVC}/token/validate | grep test
```

Save the above file in `cluster/charts/podinfo/tests`.

Deploy the Helm test runner in the `prod` namespace:

```yaml
apiVersion: helm.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: helm-tester
  namespace: prod
  annotations:
    fluxcd.io/ignore: "false"
spec:
  releaseName: helm-tester
  chart:
    git: https://github.com/weaveworks/flagger
    ref: 0.18.2
    path: charts/loadtester
  values:
    fullnameOverride: helm-tester
    serviceAccountName: helm-tester
```

Apply changes:

```sh
git add . && \
git commit -m "update podinfo" && \
git push origin master && \
fluxctl sync
```

## Run tests

Add the helm test as a pre-rollout webhook:

```yaml
apiVersion: flagger.app/v1alpha3
kind: Canary
metadata:
  name: podinfo
  namespace: prod
spec:
  canaryAnalysis:
    webhooks:
      - name: "helm test"
        type: pre-rollout
        url: http://helm-tester.prod/
        timeout: 2m
        metadata:
          type: "helm"
          cmd: "test podinfo --cleanup"
      - name: load-test
        url: http://tester.prod/
        metadata:
          cmd: "hey -z 2m -q 10 -c 2 http://podinfo:9898/"
```

Apply changes:

```sh
git add . && \
git commit -m "update podinfo" && \
git push origin master && \
fluxctl sync
```

When the canary analysis starts, Flagger will call the pre-rollout webhooks before routing traffic to the canary.
If the helm test fails, Flagger will retry until the analysis threshold is reached and the canary is rolled back.

