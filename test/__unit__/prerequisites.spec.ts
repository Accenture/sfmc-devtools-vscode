import { assert } from 'chai';
import { prerequisites } from "../../src/devtools/prerequisites";
import * as child_process from 'child_process';
import * as fs from "fs";
import { window } from '../__mocks__/vscode';

jest.mock("child_process");
jest.mock("fs");
jest.mock("../__mocks__/vscode");

describe('Test: Pre-requisites module', () => {

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('> ArePrerequisitesInstalled method: Pre-requisites should be installed', () => {

    jest.spyOn(child_process, "execSync").mockImplementation(() => "v1.1.1");

    const res = prerequisites.arePrerequisitesInstalled();

    expect(child_process.execSync).toHaveBeenCalled();
    expect(child_process.execSync).toHaveReturnedWith("v1.1.1");

    assert.isObject(
      res, 
      "ArePrerequisitesInstalled method didn't return an object."
    );
    assert.hasAllKeys(
      res, 
      ["prerequisitesInstalled", "missingPrerequisites"], 
      "ArePrerequisitesInstalled method didn't return the object keys."
    );
    assert.isTrue(
      res.prerequisitesInstalled, 
      "ArePrerequisitesInstalled prerequisites Installed key didn't return true."
    );
    assert.isEmpty(
      res.missingPrerequisites, 
      "ArePrerequisitesInstalled missingPrerequisites key isn't empty."
    );
  });

  it('> ArePrerequisitesInstalled method: Pre-requisites are not installed', async () => {

    jest.spyOn(child_process, "execSync").mockImplementation(() => {
      throw new Error("The package is not installed");
    });

    const res = prerequisites.arePrerequisitesInstalled();

    expect(child_process.execSync).toHaveBeenCalled();
    expect(child_process.execSync).toThrowError();

    assert.isObject(
      res, 
      "ArePrerequisitesInstalled didn't return an object."
    );
    assert.hasAllKeys(
      res, 
      ["prerequisitesInstalled", "missingPrerequisites"], 
      "ArePrerequisitesInstalled method didn't return the object keys."
    );
    assert.isFalse(
      res.prerequisitesInstalled, 
      "ArePrerequisitesInstalled prerequisitesInstalled key didn't return false."
    );
    assert.isNotEmpty(
      res.missingPrerequisites, 
      "ArePrerequisitesInstalled missingPrerequisites key is empty."
    );
    assert.deepEqual(
      res.missingPrerequisites,
      ['node', 'git'],
      "ArePrerequisitesInstalled missingPrerequisites key is empty."
    );
  });

  it('> noPrerequisitesHandler method: only one missing pre-requisite', async () => {

    jest.spyOn(fs, "readFileSync").mockImplementation(() => "html_content_file");

    const extensionPath: string = "path/to/extension";
    const missingPrerequisites: string[] = ['node'];

    await prerequisites.noPrerequisitesHandler(extensionPath, missingPrerequisites);

    expect(fs.readFileSync).toHaveBeenCalled();
    expect(fs.readFileSync).toHaveReturnedWith("html_content_file");

    expect(window.showInformationMessage).toHaveBeenCalled();
    expect(window.showInformationMessage).toHaveReturnedWith("Yes");

    expect(window.createWebviewPanel).toHaveBeenCalled();
  });
});