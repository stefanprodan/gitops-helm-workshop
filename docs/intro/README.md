---
title: Introduction
---

# Introduction

This guide walks you through setting up a progressive delivery GitOps pipeline on a Kubernetes cluster.

## What is GitOps?

GitOps is a way to do Continuous Delivery, it works by using Git as a source of truth for
declarative infrastructure and workloads. For Kubernetes this means using `git push` instead
of `kubectl create/apply` or `helm install/upgrade`.

In order to apply the GitOps model to Kubernetes you need three things:

* a Git repository with your workloads definitions in YAML format,
Helm charts and any other Kubernetes custom resource that defines your cluster desired state
* a container registry where your CI system pushes immutable images
(no *latest* tags, use *semantic versioning* or git *commit sha*)
* a Kubernetes controller that does a two-way synchronization:
    * watches for changes in the config repository and applies them to your cluster
    * watches the container registry for new images and  updates the workload
        definitions based on deployment policies

In this workshop you'll be using
GitHub to host the config repo,
Docker Hub as the container registry,
[Flux](https://github.com/fluxcd/flux) as the GitOps controller and
[Helm Operator](https://github.com/fluxcd/helm-operator) for app lifecycle management.

## What is Progressive Delivery?

Progressive delivery is an umbrella term for advanced deployment patterns like canaries, feature flags and A/B testing.
Progressive delivery techniques are used to reduce the risk of introducing a new software version in production
by giving app developers and SRE teams a fine-grained control over the blast radius.

In this workshop you'll be using
[Flagger](https://github.com/weaveworks/flagger),
[Linkerd](https://github.com/linkerd/linkerd2) and
[Prometheus](https://github.com/prometheus)
to automate canary releases for Helm charts.
