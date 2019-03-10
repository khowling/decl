
export default function async_kh(generatorfn, failfirst) {
  //console.log ('async_kh: returning function,  to step through the generator functions and return a promise');
  return function (...args) {
    // Calling a generator function does not execute its body immediately;
    // an iterator object for the function is returned instead
    var generator = generatorfn(...args);

    function handle(result){
      // result => { done: [Boolean], value: [Object] }
      //if (result.done) return Promise.resolve(result.value);
      if (result.done)
        return Promise.resolve(result.value);
      else
        return Promise.resolve(result.value).then(res => {
          return handle(generator.next(res));
        }, err => {
          console.log (`async_kh got error <${failfirst}> : ${err}` );
          if (failfirst) {
            throw err;
          } else {
            //return handle(generator.throw(err));
            return handle(generator.next({error: `${err}`}));
          }
        });
    }

    try {
      // When the iterator's next() method is called, the generator function's
      // body is executed until the first yield expression
      return handle(generator.next());
    } catch (ex) {
      console.log ("async_kh error " + ex);
      return Promise.reject(ex);
    }
  }
}
