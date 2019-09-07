module.exports = {
    title: 'GitOps Helm Workshop',
    description: 'Progressive Delivery for Kubernetes with Flux, Helm v3, Linkerd and Flagger',
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
    },
    head: [
        ['link', { rel: 'icon', href: '/favicon.png' }],
        ['link', { rel: 'stylesheet', href: '/website.css' }]
    ]
};

