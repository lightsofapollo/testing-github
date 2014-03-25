var Promise = require('promise');
var PromiseProxy = require('proxied-promise-object');
/**
Issue the fork and wait for the contents of the repo to be open
@param {Object} options for the fork.
@return {Promise} promise for the forking to be completed.
*/

function forkAndWait(gh, user, repoName) {
  var repo = PromiseProxy(Promise, gh.getRepo(user, repoName));

  function waitForShow(targetRepo) {
    var timeout = new Date();
    timeout.setSeconds(timeout.getSeconds() + 180);
    timeout = timeout.valueOf();

    return new Promise(function(accept, reject) {
      function shown() {
        if (Date.now() > timeout) {
          return reject(
            new Error('timeout while waiting for repoistory to be available')
          );
        }

        targetRepo.show().then(accept, function() {
          setTimeout(shown, 100);
        });
      }
      shown();
    });
  }

  return repo.fork().then(function(forked) {
    var forkRepo = PromiseProxy(Promise, gh.getRepo(forked.owner.login, forked.name));
    return waitForShow(forkRepo).then(function(show) {
      return forkRepo;
    });
  });
}

module.exports = forkAndWait;
