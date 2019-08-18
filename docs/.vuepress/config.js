module.exports = {
    title: 'GitOps Workshop',
    description: 'Progressive Delivery for Kubernetes with Flux, Helm, Linkerd and Flagger',
    themeConfig: {
        displayAllHeaders: true,
        repo: 'stefanprodan/gitops-helm-workshop',
        docsDir: 'docs',
        editLinks: false,
        editLinkText: 'Help us improve this page!',
        nav: [
            { text: 'Home', link: '/' },
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

