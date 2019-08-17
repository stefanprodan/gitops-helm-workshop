module.exports = {
    title: 'GitOps Workshop',
    description: 'Progressive Delivery for Kubernetes',
    themeConfig: {
        displayAllHeaders: true,
        nav: [
            { text: 'Home', link: '/' },
            { text: 'FluxCD', link: 'https://github.com/fluxcd/' },
            { text: 'Flagger', link: 'ttps://github.com/weaveworks/flagger' },
        ],
        sidebar: [
            '/',
            '/prerequisites/',
            '/helm/',
            '/canary/',
            '/test/'
        ]
    }
};

