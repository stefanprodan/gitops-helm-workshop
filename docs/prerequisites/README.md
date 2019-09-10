---
title: Prerequisites
---

# Prerequisites

In order to install the workshop prerequisites you'll need a Kubernetes cluster **1.13**
or newer with **Load Balancer** support and **RBAC** enabled.
Make sure you have the following tools installed locally:
* kubectl 1.14
* git 2.20

## Helm v3

Download the Helm v3 CLI:

```sh
OS=darwin-amd64 && \
mkdir -p $HOME/.helm3/bin && \
curl -sSL "https://get.helm.sh/helm-v3.0.0-beta.3-${OS}.tar.gz" | tar xvz && \
chmod +x ${OS}/helm && mv ${OS}/helm $HOME/.helm3/bin/helmv3
```

Add the helmv3 binary to your path and set Helm home:

```sh
export PATH=$PATH:$HOME/.helm3/bin
export HELM_HOME=$HOME/.helm3
```

Verify the installation with:

```sh
helmv3 version
```

## Git

Fork the [workshop](https://github.com/stefanprodan/gitops-helm-workshop) repository
and clone it locally (replace the `GHUSER` value with your GitHub username):

```sh
export GHUSER=stefanprodan
git clone https://github.com/${GHUSER}/gitops-helm-workshop
```

Set your GitHub username and email:

```sh
cd gitops-helm-workshop
git config user.name "${GHUSER}"
git config user.email "your@main.address"
```

Cluster state directory structure:

```
├── cluster
    ├── canaries
    ├── charts
    │   └── podinfo
    ├── namespaces
    └── releases
```

## Flux

Add FluxCD repository to Helm repos:

```sh
helmv3 repo add fluxcd https://charts.fluxcd.io
```

Create the fluxcd namespace:

```sh
kubectl create ns fluxcd
```

Install Flux by providing your GitHub repository URL:

```sh
helmv3 upgrade -i flux fluxcd/flux --wait \
--namespace fluxcd \
--set registry.pollInterval=1m \
--set git.pollInterval=1m \
--set git.url=git@github.com:${GHUSER}/gitops-helm-workshop
```

Install fluxctl:

```sh
# macOS and linux
curl -sL https://fluxcd.io/install | sh
export PATH=$PATH:$HOME/.fluxcd/bin

# windows
https://github.com/fluxcd/flux/releases
```

Find the Git SSH public key:

```sh
export FLUX_FORWARD_NAMESPACE=fluxcd

fluxctl identity
```

Copy the public key and create a deploy key with write access on your GitHub repository.
Go to `Settings > Deploy keys` click on `Add deploy key`, check `Allow write access`,
paste the Flux public key and click `Add key`.

## Helm Operator

Install the HelmRelease CRD:

```sh
kubectl apply -f https://raw.githubusercontent.com/fluxcd/helm-operator/helm-v3/deploy/flux-helm-release-crd.yaml
```

Install Flux Helm Operator in the `fluxcd` namespace:

```sh
helmv3 upgrade -i helm-operator fluxcd/helm-operator --wait \
--namespace fluxcd \
--set git.ssh.secretName=flux-git-deploy \
--set git.pollInterval=1m \
--set chartsSyncInterval=1m \
--set configureRepositories.enable=true \
--set configureRepositories.repositories[0].name=stable \
--set configureRepositories.repositories[0].url=https://kubernetes-charts.storage.googleapis.com \
--set extraEnvs[0].name=HELM_VERSION \
--set extraEnvs[0].value=v3 \
--set image.repository=docker.io/fluxcd/helm-operator-prerelease \
--set image.tag=helm-v3-71bc9d62
```

## Linkerd

Download the Linkerd v2 CLI:

```sh
# macOS and linux
curl -sL https://run.linkerd.io/install | sh
export PATH=$PATH:$HOME/.linkerd2/bin

# windows
https://github.com/linkerd/linkerd2/releases
```

Install the Linkerd control plane in the `linkerd` namespace:

```sh
linkerd install | kubectl apply -f -
```

Validate the install with:

```sh
linkerd check
```

## Flagger

Add Flagger Helm repository:

```sh
helmv3 repo add flagger https://flagger.app
```

Install Flagger's Canary CRD:

```sh
kubectl apply -f https://raw.githubusercontent.com/weaveworks/flagger/master/artifacts/flagger/crd.yaml
```

Install Flagger in the `linkerd` namespace:

```sh
helmv3 upgrade -i flagger flagger/flagger --wait \
--namespace linkerd \
--set crd.create=false \
--set metricsServer=http://linkerd-prometheus:9090 \
--set meshProvider=linkerd
```
