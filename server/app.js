const express = require('express')
const session = require('express-session')
const {dbInit, USE_COSMOS} = require ('./db.js')

const MongoStore = USE_COSMOS ?  require('./libs/cosmos-express')(session) : require('connect-mongo')(session)

const passport = require ('passport');
const path = require('path');
//var favicon = require('static-favicon');
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')

//var herokuMemcachedStore = require('connect-heroku-memcached')(express);

const port = process.env.PORT || 3000
const app = express();

// The word “async” before a function means one simple thing: a function always returns a promise.
// If the code has return <non-promise> in it, then JavaScript automatically wraps it into a resolved promise with that value.


const initapp = async () => {

  const db = await dbInit()
  
  app.use(session({
          secret: '99hashfromthis99',
          store:  new MongoStore({db: db, collection: 'session'}),
          saveUninitialized: true,
          resave: true
      })
  );

  // use passport session (allows user to be captured in req.user)
  app.use(passport.initialize());
  app.use(passport.session());

  // to handle passportjs deserialiation errors (ie if a logged in user is deleted)
  app.use(function(err, req, res, next) {
      console.log (`app use error ${err}`)
      if (err) {
          req.logout();
          if (req.originalUrl === "/") {
              next(); // never redirect login page to itself
          } else {
              req.flash("error", err.message);
              res.redirect("/");
          }
      } else {
          next()
      }
  })

  // routes
  // routes are the last thing to be initialised!
  app.use('/auth', require('./routes/auth'))
  app.use('/api', require('./routes/dform'))
  app.use('/api', require('./routes/ops'))
  app.use('/api', require('./routes/file'))

  /// catch 404 and forward to error handler
  app.use(function (req, res, next) {
      var err = new Error('Not Found');
      err.status = 404;
      next(err);
  });

  /// error handlers

  // development error handler
  // will print stacktrace
  if (app.get('env') === 'development') {
      app.use(function (err, req, res, next) {
          res.status(err.status || 500).json({
              message: 'dev : ' + err.message,
              error: err
          });
      });
  } else {

    // production error handler
    // no stacktraces leaked to user
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: {}
        });
    });
  }
}

// Start the application after the database connection is ready
// This is requried if serving client app from react hot loader, and server from node (different ports)
app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:8000");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "X-Requested-With,Authorization,Content-Type");
  res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE");
  
  if ('OPTIONS' === req.method) {
      return res.send(204)
  }
  next()
});


app.use('/assets', express.static(path.join(__dirname, '../assets')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

const pdb = new Promise((resolve, reject) => {
    initapp().then (resolve())
})

app.get('/dbready', (req,res) => {
  pdb.then((db) => res.json({"gotdb": 1}));
})

app.listen(port);
console.log(`Listening on port ${port}`);


module.exports = app;
