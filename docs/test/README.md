---
title: Canary Helm Tests
---

# Helm Tests

Flagger comes with a testing service that can run Helm tests when configured as a webhook.

## Create tests

Create a test for the podinfo token API:

```yaml{11}
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
    linkerd.io/inject: disabled
    "helm.sh/hook": test-success
spec:
  containers:
    - name: tools
      image: giantswarm/tiny-tools
      command:
        - sh
        - -c
        - |
          TOKEN=$(curl -sd 'test' ${PODINFO_SVC}/token | jq -r .token) &&
          curl -H "Authorization: Bearer ${TOKEN}" ${PODINFO_SVC}/token/validate | grep test
      env:
      - name: PODINFO_SVC
        value: {{ template "podinfo.fullname" . }}:{{ .Values.service.externalPort }}
  restartPolicy: Never
```

Save the above file in `cluster/charts/podinfo/tests`.

Deploy the Helm test runner in the `prod` namespace:

```yaml{7}
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
    ref: 1.0.0-rc.1
    path: charts/loadtester
  values:
    fullnameOverride: helm-tester
    serviceAccountName: helm-tester
```

Apply changes:

```sh
git add -A && \
git commit -m "install helm-tester" && \
git push origin master && \
fluxctl sync
```

## Run tests

Add the helm test as a pre-rollout webhook:

```yaml{9,10,11,12,13,14,15}
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: prod
spec:
  analysis:
    webhooks:
      - name: "helm test"
        type: pre-rollout
        url: http://helm-tester.prod/
        timeout: 2m
        metadata:
          type: "helmv3"
          cmd: "test podinfo"
      - name: load-test
        url: http://load-tester.prod/
        metadata:
          cmd: "hey -z 2m -q 10 -c 2 http://podinfo-canary.prod:9898/"
```

Apply changes:

```sh
git add -A && \
git commit -m "update podinfo" && \
git push origin master && \
fluxctl sync
```

When the canary analysis starts, Flagger will call the pre-rollout webhooks before routing traffic to the canary.
If the helm test fails, Flagger will retry until the analysis threshold is reached and the canary is rolled back.

