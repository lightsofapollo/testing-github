testing-github
==============

Bunch of very opinionated and specific to testing github utilities used in automation tests.

See the [tests/pullrequest_test.js] for an indepth guide how to use
this.

## Usage: (pullrequest)

The pull request module heavily abstracts the operations required to
make a pull request to a given repository.

Calling the module will do the following:

  - create a fork for the token user if not already available
  - create a unique branch in the fork
  - add given files to the branch in the fork
  - create a pull request from the fork to the master (optionally
    specifying the branch)


```js

var testPr = require('testing-github/pullrequest');

testPr(
  'GITHUB_TOKEN',
  {
    repo: 'testing-github', // base repo
    user: 'lightsofapollo', //base user
    branch: 'master', // base branch
    title: 'title of the pr',
    body: 'description of the pull request',
    files: [
      { commit: 'I haz add file', path: 'filename.txt', content: 'content of file' }
    ]
  }
).then(function(pullRequest) {
  // XXX: Add documentation for the pull request repsonse
});

```

## LICENSE

Copyright 2014, Mozilla Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
