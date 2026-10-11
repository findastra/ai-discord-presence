import test from 'node:test';
import assert from 'node:assert/strict';
import { projectDisplayName, selectSession, activity } from '../src/presence.js';
import { folderProject } from '../src/detector.js';

test('old Pet Apps folders produce the official project name through the Discord payload', () => {
  for (const old of ['Findastra Pet Apps', 'findastra-pet-apps', 'astras-pet-apps']) {
    const project = folderProject('C:/example/' + old);
    assert.equal(project, "Astra's Pet Apps");
    assert.equal(activity(100, undefined, project, 'gpt-6-astra').state, "Working on Astra's Pet Apps");
  }
});
test('canonicalization preserves unrelated names, rotation and sharing opt-out', () => {
  assert.equal(projectDisplayName('Other Findastra Pet Apps notes'), 'Other Findastra Pet Apps notes');
  assert.equal(projectDisplayName('Paper Girl'), 'Paper Girl');
  const detection = { sessions: [{project: 'Findastra Pet Apps'}, {project: 'Paper Girl'}] };
  assert.equal(selectSession(detection, {shareProject: true}, 0).project, "Astra's Pet Apps");
  assert.equal(selectSession(detection, {shareProject: true}, 15000).project, 'Paper Girl');
  assert.equal(selectSession(detection, {shareProject: false}, 0).project, '');
  assert.equal(selectSession(detection, {shareProject: true, projectName: 'Findastra Pet Apps'}, 0).project, "Astra's Pet Apps");
});
