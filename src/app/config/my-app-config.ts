export default {

    oidc: {
        // public identifier of client app
        clientId: '0oa780prbsvioHiCc5d7',  

        // issuer of token, url used when authorizing with okta Authorization Server
        issuer: 'https://dev-44178531.okta.com/oauth2/default',  

        // once user login redirect to home page
        redirectUri: 'https://localhost:4200/login/callback',

        // it provides access to information about user. openid- required for authentication requests
        scopes: ['openid', 'profile', 'email']
    }
}
