// Adapted from https://github.com/coveo/semantic-monorepo-tools/blob/main/scripts/release.mjs
import {
  getLastTag,
  parseCommits,
  getCommits,
  getCurrentVersion,
  getNextVersion,
  npmBumpVersion,
  generateChangelog,
  writeChangelog,
  gitPushTags,
  gitTag,
  gitSetupUser,
  npmPublish,
  gitAdd,
  gitCommit,
  gitPush,
} from '@coveo/semantic-monorepo-tools';
import angularChangelogConvention from 'conventional-changelog-angular';
import {Octokit} from 'octokit';
import {createActionAuth} from '@octokit/auth-action';

// Get all commits since last release bump the root package.json version.
(async () => {
  //#region Constants
  const PATH = '.';
  const VERSION_PREFIX = 'v';
  const CONVENTION = await angularChangelogConvention();
  const REPO_OWNER = 'coveo';
  const REPO_NAME = 'push-api-client.js';
  const GIT_USERNAME = 'github-actions';
  const GIT_EMAIL = 'github-actions@github.com';
  //#endregion

  // #region Setup Git
  await gitSetupUser(GIT_USERNAME, GIT_EMAIL);
  //#endregion
  //#region GitHub authentication
  const octokit = new Octokit({
    authStrategy: createActionAuth,
  });
  //#endregion
  //#region Find current and new versions
  const lastTag = await getLastTag(VERSION_PREFIX);
  // Passing an empty string allow empty commits (i.e. that does not modify any files) to be included.
  const commits = await getCommits('', lastTag);
  const parsedCommits = parseCommits(commits, CONVENTION.parserOpts);
  const bumpInfo = CONVENTION.whatBump(parsedCommits);
  const currentVersion = getCurrentVersion(PATH);
  const newVersion = getNextVersion(currentVersion, bumpInfo);
  const newVersionTag = `${VERSION_PREFIX}${newVersion}`;
  //#endregion

  // Bump the NPM version.
  await npmBumpVersion(newVersion, PATH);
  //#region Generate changelog if needed
  let changelog = '';
  if (parsedCommits.length > 0) {
    changelog = await generateChangelog(
      parsedCommits,
      newVersion,
      {
        host: 'https://github.com',
        owner: REPO_OWNER,
        repository: REPO_NAME,
        linkReferences: true,
        currentTag: newVersionTag,
        previousTag: lastTag,
      },
      CONVENTION.writerOpts
    );
    await writeChangelog(PATH, changelog);
  }
  //#endregion

  console.log(1);
  //#region Commit changelog, tag version and push
  await gitAdd(PATH);
  await gitCommit(`chore(release): ${newVersion} [skip ci]`, PATH);
  console.log(2);
  await gitPush().catch((e)=>console.warn(e));
  console.log(3);
  //#endregion

  //#region Create & push tag
  await gitTag(newVersionTag);
  await gitPushTags();
  //#endregion

  // Publish the new version on NPM
  await npmPublish(PATH);

  //#region Create GitHub Release on last tag
  const [, ...bodyArray] = changelog.split('\n');
  await octokit.rest.repos.createRelease({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    tag_name: newVersionTag,
    name: `Release ${newVersionTag}`,
    body: bodyArray.join('\n'),
  });
  //#endregion
})();
