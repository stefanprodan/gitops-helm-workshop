---
title: Helm Releases
---

# Helm Releases

A chart release is described through a Kubernetes custom resource named **HelmRelease**.

A Helm release can refer a chart from:
* public or private Helm repositories over HTTPS
* public or private Git repositories over SSH

## Install NGINX

To expose applications outside of the cluster you'll be using the NGINX ingress controller. 
The controller will run inside the Linkerd mesh.

Create a namespace with linkerd injection enabled:

```yaml{5}
apiVersion: v1
kind: Namespace
metadata:
  annotations:
    fluxcd.io/ignore: "false"
    linkerd.io/inject: enabled
  name: ingress-nginx
```

Create a Helm release to install the NGINX ingress controller:

```yaml{7}
apiVersion: helm.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: nginx-ingress
  namespace: ingress-nginx
  annotations:
    fluxcd.io/ignore: "false"
spec:
  releaseName: nginx-ingress
  chart:
    repository: https://kubernetes-charts.storage.googleapis.com/
    name: nginx-ingress
    version: 1.33.4
  values:
    controller:
      service:
        type: LoadBalancer
```

Apply changes:

```sh
git add -A && \
git commit -m "install ingress" && \
git push origin master && \
fluxctl sync
```

Validate that the Helm operator has installed the release:

```sh
kubectl -n ingress-nginx get hr
```

Find the public IP of the ingress controller:

```sh
kubectl -n ingress-nginx get svc
```

## Install podinfo

[Podinfo](http://github.com/stefanprodan/podinfo) is tiny Go web application.
You'll be installing podinfo using a Helm chart stored in the git repository at `cluster/charts/podinfo`.

Create the `prod` namespace with linkerd injection enabled:

```yaml{5}
apiVersion: v1
kind: Namespace
metadata:
  annotations:
    fluxcd.io/ignore: "false"
    linkerd.io/inject: enabled
  name: prod
```

Create a Helm release to install the podinfo chart
(replace `GHUSER` with your GitHub username and `LB-PUBLIC-IP` with your ingress IP):

```yaml{7,11,31}
apiVersion: helm.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: podinfo
  namespace: prod
  annotations:
    fluxcd.io/ignore: "false"
spec:
  releaseName: podinfo
  chart:
    git: git@github.com:GHUSER/gitops-helm-workshop
    ref: master
    path: cluster/charts/podinfo
  values:
    image:
      repository: stefanprodan/podinfo
      tag: 3.1.0
    service:
      enabled: true
      type: ClusterIP
    ingress:
      enabled: true
      annotations:
        kubernetes.io/ingress.class: "nginx"
        nginx.ingress.kubernetes.io/configuration-snippet: |
          proxy_set_header l5d-dst-override $service_name.$namespace.svc.cluster.local:9898;
          proxy_hide_header l5d-remote-ip;
          proxy_hide_header l5d-server-id;
      path: /
      hosts:
        - LB-PUBLIC-IP.nip.io
```

Note that if you are on EKS, the host should be set to the `elb.amazonaws.com` address:

```sh
kubectl -n ingress-nginx get svc | grep Ingress
```

Apply changes:

```sh
git add -A && \
git commit -m "install podinfo" && \
git push origin master && \
fluxctl sync
```

Validate that the Helm operator has installed podinfo:

```sh
kubectl -n prod get hr
```

Open your browser and navigate to `http://LB-PUBLIC-IP.nip.io/`, you should see podinfo v3.1.0 UI.

## Automated upgrade

Flux can be used to automate container image updates in your cluster.
You can enable the automate image tag updates by annotating Helm release objects.
You can also control what tags should be considered for an
update by using glob, regex or semantic version expressions.

Edit the podinfo Helm release and enable Flux automated image updates:

```yaml{5,6}
apiVersion: helm.fluxcd.io/v1
kind: HelmRelease
metadata:
  annotations:
    fluxcd.io/automated: "true"
    fluxcd.io/tag.chart-image: semver:~3.1
```

Apply changes:

```sh
git add -A && \
git commit -m "automate podinfo" && \
git push origin master && \
fluxctl sync
```

Validate that the Helm operator has upgraded podinfo:

```sh
kubectl -n prod get hr
```

Pull the changes made by Flux locally:

```sh
git pull origin master
```

Open your browser and navigate to `http://LB-PUBLIC-IP.nip.io/`, you should see podinfo v3.1.5 UI.

## Sealed secrets

In order to store secrets safely in a public Git repo you can use the
[Sealed Secrets controller](https://github.com/bitnami-labs/sealed-secrets)
and encrypt your Kubernetes Secrets into **SealedSecrets**.
The sealed secret can be decrypted only by the controller running in your cluster.

Create the Sealed Secrets Helm release:

```yaml{7}
apiVersion: helm.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: sealed-secrets
  namespace: fluxcd
  annotations:
    fluxcd.io/ignore: "false"
spec:
  releaseName: sealed-secrets
  chart:
    repository: https://kubernetes-charts.storage.googleapis.com/
    name: sealed-secrets
    version: 1.8.0
```

Apply changes:

```sh
git add -A && \
git commit -m "install sealed-secrets" && \
git push origin master && \
fluxctl sync
```

Install the kubeseal CLI:

```sh
wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v1.8.0/kubeseal-darwin-amd64
sudo install -m 755 kubeseal-darwin-amd64 /usr/local/bin/kubeseal
```

At startup, the sealed-secrets controller generates a RSA key and logs the public key.
Using kubeseal you can save your public key as pub-cert.pem,
the public key can be safely stored in Git, and can be used to encrypt secrets
without direct access to the Kubernetes cluster:

```sh
kubeseal --fetch-cert \
--controller-namespace=fluxcd \
--controller-name=sealed-secrets \
> pub-cert.pem
```

You can generate a Kubernetes secret locally with kubectl and encrypt it with kubeseal:

```sh
kubectl -n prod create secret generic basic-auth \
--from-literal=user=admin \
--from-literal=password=admin \
--dry-run \
-o json > basic-auth.json

kubeseal --format=yaml --cert=pub-cert.pem < basic-auth.json > basic-auth.yaml
```

This generates a custom resource of type SealedSecret that contains the encrypted credentials.

Flux will apply the sealed secret on your cluster and sealed-secrets controller will
then decrypt it into a Kubernetes secret.

To prepare for disaster recovery you should backup the Sealed Secrets controller private key with:

```sh
kubectl get secret -n fluxcd sealed-secrets-key -o yaml \
--export > sealed-secrets-key.yaml
```

To restore from backup after a disaster, replace the newly-created secret and restart the controller:

```sh
kubectl replace secret -n fluxcd sealed-secrets-key -f sealed-secrets-key.yaml
kubectl delete pod -n fluxcd -l app=sealed-secrets
```
