module.exports = {
    title: 'GitOps Workshop',
    description: 'Progressive Delivery for Kubernetes with Flux, Helm, Linkerd and Flagger',
    themeConfig: {
        displayAllHeaders: true,
        nav: [
            { text: 'Home', link: '/' },
            { text: 'Repo', link: 'https://github.com/stefanprodan/gitops-helm-workshop' },
        ],
        sidebar: [
            '/',
            '/intro/',
            '/prerequisites/',
            '/helm/',
            '/canary/',
            '/test/'
        ]
    }
};

