---
title: Canary Releases
---

# Canary Releases

A canary release is described with a Kubernetes custom resource named **Canary**.

## Application bootstrap

Edit the podinfo Helm release and disable the image updates and the ClusterIP service:

```yaml{7,13,15}
apiVersion: helm.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: podinfo
  namespace: prod
  annotations:
    fluxcd.io/automated: "false"
spec:
  releaseName: podinfo
  values:
    image:
      repository: stefanprodan/podinfo
      tag: 3.1.0
    service:
      enabled: false
      type: ClusterIP
```

Apply changes:

```sh
git add -A && \
git commit -m "prep canary" && \
git push origin master && \
fluxctl sync
```

Create a canary release for podinfo:

```yaml{7}
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: prod
  annotations:
    fluxcd.io/ignore: "false"
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: podinfo
  service:
    port: 9898
  analysis:
    interval: 10s
    maxWeight: 100
    stepWeight: 5
    threshold: 5
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
    webhooks:
      - name: acceptance-test
        type: pre-rollout
        url: http://flagger-loadtester.prod/
        timeout: 30s
        metadata:
          type: bash
          cmd: "curl -sd 'test' http://podinfo-canary.prod:9898/token | grep token"
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.prod/
        metadata:
          cmd: "hey -z 2m -q 10 -c 2 http://podinfo-canary.prod:9898/"
```

Apply changes:

```sh
git add -A && \
git commit -m "add canary" && \
git push origin master && \
fluxctl sync
```

Validate that Flagger has initialized the canary:

```sh
kubectl -n prod get canary
```

## Automated canary promotion 

Install the load testing service to generate traffic during the canary analysis:

```yaml{7}
apiVersion: helm.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: load-tester
  namespace: prod
  annotations:
    fluxcd.io/ignore: "false"
spec:
  releaseName: load-tester
  chart:
    git: https://github.com/weaveworks/flagger
    ref: 1.0.0-rc.1
    path: charts/loadtester
  values:
    fullnameOverride: load-tester
```

When you deploy a new podinfo version, Flagger gradually shifts traffic to the canary,
and at the same time, measures the requests success rate as well as the average response duration.
Based on an analysis of these Linkerd provided metrics, a canary deployment is either promoted or rolled back.

Trigger a canary deployment by updating the container image:

```yaml{7}
apiVersion: helm.fluxcd.io/v1
kind: HelmRelease
spec:
  releaseName: podinfo
  values:
    image:
      tag: 3.1.1
```

Apply changes:

```sh
git add -A && \
git commit -m "update podinfo" && \
git push origin master && \
fluxctl sync
```

When Flagger detects that the deployment revision changed it will start a new rollout.
You can monitor the traffic shifting with:

```sh
watch kubectl -n prod get canaries
```

## Automated rollback

During the canary analysis you can generate HTTP 500 errors and high latency to test if Flagger pauses and
rolls back the faulted version.

Trigger another canary release:

```yaml{7}
apiVersion: helm.fluxcd.io/v1
kind: HelmRelease
spec:
  releaseName: podinfo
  values:
    image:
      tag: 3.1.2
```

Apply changes:

```sh
git add -A && \
git commit -m "update podinfo" && \
git push origin master && \
fluxctl sync
```

Exec into the tester pod and generate HTTP 500 errors:

```sh
kubectl -n prod exec -it $(kubectl -n prod get pods -o name | grep -m1 load-tester | cut -d'/' -f 2) bash

$ hey -z 1m -c 5 -q 5 http://podinfo-canary:9898/status/500
$ hey -z 1m -c 5 -q 5 http://podinfo-canary:9898/delay/1
```

When the number of failed checks reaches the canary analysis threshold, the traffic is routed back to the primary and 
the canary is scaled to zero.

Watch Flagger logs with:

```
$ kubectl -n linkerd logs deployment/flagger -f | jq .msg

 Starting canary analysis for podinfo.prod
 Advance podinfo.test canary weight 5
 Advance podinfo.test canary weight 10
 Advance podinfo.test canary weight 15
 Halt podinfo.test advancement success rate 69.17% < 99%
 Halt podinfo.test advancement success rate 61.39% < 99%
 Halt podinfo.test advancement success rate 55.06% < 99%
 Halt podinfo.test advancement request duration 1.20s > 0.5s
 Halt podinfo.test advancement request duration 1.45s > 0.5s
 Rolling back podinfo.prod failed checks threshold reached 5
 Canary failed! Scaling down podinfo.test
```

## Monitoring with Linkerd

The Linkerd dashboard provides a high level view of what is happening with your services in real time.
It can be used to visualize service dependencies, traffic splitting and understand the health of specific service routes.

Open the dashboard by running:

```sh
linkerd dashboard --port=50750
```

During the canary analysis, navigate to:

```
http://127.0.0.1:50750/namespaces/ingress-nginx/deployments/nginx-ingress-controller
```

![linkerd](/linkerd-dashboard.png)

You can monitor the live traffic for the production namespace from the command line with:

```sh
linkerd -n prod top deploy
```

And you can view all the routes exposed by podinfo with:

```sh
linkerd -n prod routes service/podinfo
```

The above routes have been generated from the podinfo swagger spec and exported as Linkerd service profile.


