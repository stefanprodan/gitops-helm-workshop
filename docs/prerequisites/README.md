---
title: Prerequisites
---

# Prerequisites

In order ot install the workshop prerequisites you'll need a Kubernetes cluster **1.13**
or newer with **Load Balancer** support.
Make sure you have the following tools installed locally:
* kubectl 1.14
* helm 3.0
* git 2.20

## Git

Fork the [gitops-workshop](https://github.com/stefanprodan/gitops-workshop) repository
and clone it locally (replace the `GHUSER` value with your GitHub username):

```sh
export GHUSER=stefanprodan
git clone https://github.com/${GHUSER}/gitops-workshop
cd gitops-workshop
```

Set your GitHub username and email:

```sh
git config user.name "GHUSER"
git config user.email "your@main.address"
```

## Flux

Add FluxCD repository to Helm repos:

```sh
helm repo add fluxcd https://charts.fluxcd.io
```

Install Flux by providing your GitHub repository URL:

```sh
helm upgrade -i flux fluxcd/flux --wait \
--namespace fluxcd \
--set git.url=git@github.com:${GHUSER}/gitops-workshop
```

Install fluxctl:

```sh
# macOS
brew install fluxctl
# linux
sudo snap install fluxctl --edge
# windows
https://github.com/fluxcd/flux/releases/download/1.13.3/fluxctl_windows_amd64
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

Install Flux Helm Operator in the `fluxcd` namespace:

```sh
helm upgrade -i helm-operator fluxcd/helm-operator --wait \
--namespace fluxcd \
--set createCRD=true \
--set git.ssh.secret=flux-git-deploy
```

## Linkerd

Download the Linkerd v2 CLI:

```sh
curl -sL https://run.linkerd.io/install | sh
export PATH=$PATH:$HOME/.linkerd2/bin
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
helm repo add flagger https://flagger.app
```

Install Flagger in the `linkerd` namespace:

```sh
helm upgrade -i flagger flagger/flagger --wait \
--namespace linkerd \
--set crd.create=true \
--set metricsServer=http://linkerd-prometheus:9090 \
--set meshProvider=linkerd
```
