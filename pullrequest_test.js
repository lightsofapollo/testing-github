suite('pull_request', function() {
  this.timeout('50s');

  var createPR = require('./pullrequest');

  var auth = {};
  suiteSetup(function() {
    var envs = {
      GH_TESTING_USER: 'user',
      GH_TESTING_REPO: 'repo',
      GH_TESTING_TOKEN: 'token'
    };

    for (var env in envs) {
      assert(
        process.env[env],
        env + ' environment variable is required for tests'
      );
      auth[envs[env]] = process.env[env];
    }
  });

  suite('pull request with files', function() {
    var pr;

    setup(function() {
      return createPR(auth, {
        title: 'test pull request',
        files: [
          { commit: 'first', path: 'a.txt', content: 'woot' }
        ]
      }).then(function(_pr) {
        pr = _pr;
      });
    });

    teardown(function() {
      return pr.destroy().catch(function() {
        // ignore errors
      });
    });

    test('.branch exists', function() {
      assert.ok(pr.branch, 'has .branch');
      return pr.sourceRepoBranches().then(function(list) {
        assert.ok(
          list.indexOf(pr.branch) !== -1,
          list.join(', ') + ' has branch ' + pr.branch
        );
      });
    });

    test('.destroy', function() {
      return pr.destroy().then(
        pr.sourceRepoBranches.bind(pr)
      ).then(function(list) {
        assert.ok(
          list.indexOf(pr.branch) === -1,
          'removes pr'
        );
      });
    });
  });
});
