const passport = require('passport');
const express = require('express');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const BearerStrategy = require('passport-http-bearer').Strategy;
const jwt = require('jsonwebtoken');
const request = require('request');

const app = express();

app.use(express.static(__dirname));

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: {
        path: '/',
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 60 * 60 * 24, //1 day
    }
}));

//
//  Register passport middlewares. Currently we are using
//  1) JWT Bearer authentication
//  2) Google authentication
//
(function(app) {
    app.use(passport.initialize());

    //
    //  Tell passport to save
    //
    app.use(passport.session(function(a, b, c) {
        console.log("123");
    }));

    passport.serializeUser((user, done) => {
        var token = jwt.sign({
            name: user.profile.displayName,
            externalAccessToken: user.externalAccessToken,
            //email: user.profile.emails[0].value,
        }, 'MYSECRET');

        done(null, token);
    });

    passport.deserializeUser((token, done) => {
        var user = jwt.verify(token, 'MYSECRET');
        done(null, user);
    });

    passport.use(new GoogleStrategy({
            clientID: "765152189369-83cgm1ma79h2g72qkjb02e8f1nadibau.apps.googleusercontent.com",
            clientSecret: "tHf4bOGOcVU18meDAydueZzs",
            callbackURL: "http://localhost:3000/auth/google/callback",
        },
        function (accessToken, refreshToken, profile, cb) {
            cb(null, {
                profile,
                accessToken,
            });
        }
    ));

    passport.use(new FacebookStrategy({
            clientID: "425387451215422",
            clientSecret: "9382483684839f61bd7a5c93d1375a45",
            callbackURL: "http://localhost:3000/auth/facebook/callback",
        },
        function (accessToken, refreshToken, profile, cb) {
            cb(null, {
                profile,
                externalAccessToken: accessToken,
            });
        }
    ));
})(app);

app.get('/auth/details', function (req, res) {
    if (!req.user) {
        res.status(401).end();
        return;
    }

    res.json({
        name: req.user.name,
        email: req.user.email,
        token: req.session.passport.user,
        externalAccessToken: req.user.externalAccessToken,
    });
});

app.get('/noop',
    function(req, res, next) {
        console.log(req.user);
        res.header("Content-Type", "application/javascript");
        res.write("{}");
        res.status(200).end();
    });

//
//  Redirect the user of Google login page
//
app.get('/auth/google',
    function(req, res, next) {
        console.log(req.user);
        next();
    },
    passport.authenticate('google', {scope: ['profile', 'email']}));

app.get('/auth/facebook',
    function(req, res, next) {
        console.log(req.user);
        next();
    },
    passport.authenticate('facebook', {scope: ['email']}));

//
//  Invoked by Google when authentication completes
//
app.get('/auth/google/callback', passport.authenticate('google', {failureRedirect: '/login'}), function (req, res) {
    var token = jwt.sign({
        name: req.user.profile.displayName,
        email: req.user.profile.emails[0].value,
    }, 'MYSECRET');

    console.log(token);

    res.redirect(`/?doneOAuth`);
});

app.get('/auth/facebook/callback', passport.authenticate('facebook', {failureRedirect: '/login'}), function (req, res) {
    var token = jwt.sign({
        name: req.user.profile.displayName,
        //email: req.user.profile.emails[0].value,
    }, 'MYSECRET');

    console.log(req.user);

    res.redirect(`/?doneOAuth`);
});

app.get('/auth/logout',
    function(req, res) {
        req.logout();
        res.redirect('/');
    });

//
//  Register passthrough middleware. Each request starting with "/api" is authenticated by
//  passport.authenticate('bearer') and then is redirected to ASP.NET
//  The redirect includes all headers including the "Autorization" header so ASP.NET can
//  authorize the request on its side
//
(function(app) {
    const allowedMethods = ["get", "post", "put", "delete"];
    app.use('/api', function (req, res) {
        const method = req.method.toLowerCase();

        const r = request[method]({
            uri: "http://localhost:59988" + req.originalUrl,
            json: req.body,
        });

        if (!allowedMethods.includes(method)) {
            res.status(400).send("invalid method");
            return;
        }

        return req.pipe(r).on("error", function (err) {
            //
            //  Must handles errors here, else, Node closes
            //
            res.status(500);
            res.statusMessage = err.message;
            res.send();
        }).pipe(res);
    });
})(app);

app.listen(3000, function () {
    console.log("Server is running");
});
