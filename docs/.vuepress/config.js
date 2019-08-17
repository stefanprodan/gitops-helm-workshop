module.exports = {
    title: 'GitOps Workshop',
    description: 'Progressive Delivery for Kubernetes with Flux, Helm, Linkerd and Flagger',
    themeConfig: {
        displayAllHeaders: true,
        nav: [
            { text: 'Home', link: '/' },
            { text: 'FluxCD', link: 'https://github.com/fluxcd/' },
            { text: 'Flagger', link: 'ttps://github.com/weaveworks/flagger' },
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

