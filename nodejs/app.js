const appModule = angular.module("myApp", []);

appModule.config(function($locationProvider) {
    $locationProvider.html5Mode(true);
});

class AppComponent {
    constructor($location, appService, $http) {
        this.appService = appService;
        this.$http = $http;

        if ($location.search().doneOAuth && window.opener && window.opener.appService) {
            window.opener.appService.completeAuthentication();
            window.close();
        }
        else {
            appService.completeAuthentication();
        }
    }

    get user() {
        return this.appService.user;
    }

    getDetails() {
        this.$http.get("/auth/details").then(res => {
            console.log("details", res.data);
        });
    }

    sendGet() {
        const headers = {};

        if (this.appService.user) {
            headers['Authorization'] = "Bearer " + this.appService.user.token;
        }

        this.$http.get("/api/contact", {
            headers,
        }).then(res => {
            console.log(res.data);
        });
    }

    sendPost() {
        const headers = {};

        if (this.appService.user) {
            headers['Authorization'] = "Bearer " + this.appService.user.token;
        }

        this.$http.post("/api/contact", {}, {
            headers
        }).then(res => {
            console.log(res.data);
        });
    }

    graphAPI() {
        this.$http.get(`http://graph.facebook.com/me?fields=email&access_token=${this.appService.user.externalAccessToken}`).then(res => {
            console.log("email", res.data.email);
        })
    }
}

appModule.component("appRoot", {
    controller: AppComponent,
    templateUrl: "app.component.html",
});

class AppService {
    constructor($rootScope, $http) {
        this.$http = $http;
        this.$rootScope = $rootScope;
    }

    completeAuthentication() {
        this.$http.get("/auth/details").then(res => {
            console.log("User is authenticated", res.data);
            this.user = res.data;
        }).catch(err => {
            console.log("User is NOT authenticated");
        });

        // this.user = user;
        //
        // if(!this.user.name) {
        //     //
        //     //  We have a token but we dont have user details. Get missing data from server
        //     //
        // }

        this.$rootScope.$applyAsync();
    }
}

appModule.service("appService", AppService);

appModule.run(function(appService) {
    window.appService = appService;
});

angular.bootstrap(document, [appModule.name]);
