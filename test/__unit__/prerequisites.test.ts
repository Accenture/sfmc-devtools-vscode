import { assert } from 'chai';
import { prerequisites } from "../../src/devtools/prerequisites";
import * as child_process from "child_process";

describe('Test: Prerequisites module', () => {
  it('> Prerequisites should be installed', () => {
    const res = prerequisites.arePrerequisitesInstalled();
    assert.isObject(
      res, 
      "ArePrerequisitesInstalled didn't return an object."
    );
    assert.hasAllKeys(
      res, 
      ["prerequisitesInstalled", "missingPrerequisites"], 
      "ArePrerequisitesInstalled doesn't have prerequisitesInstalled or missingPrerequisites keys."
    );
    assert.isTrue(
      res.prerequisitesInstalled, 
      "ArePrerequisitesInstalled prerequisitesInstalled key didn't return true."
    );
    assert.isEmpty(
      res.missingPrerequisites, 
      "ArePrerequisitesInstalled missingPrerequisites key isn't empty."
    );
  });
  it('> Prerequisites are not installed', () => {
    jest.spyOn(child_process, "execSync").mockImplementation(() => "success");
    const res = prerequisites.arePrerequisitesInstalled();
    console.log(res);
  });
});