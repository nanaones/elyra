/*
 * Copyright 2018-2022 Elyra Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

describe('Pipeline Editor tests', () => {
  beforeEach(() => {
    cy.deleteFile('generic-test.yaml'); // previously exported pipeline
    cy.deleteFile('generic-test-custom.yaml'); // previously exported pipeline
    cy.deleteFile('generic-test.py'); // previously exported pipeline
    cy.deleteFile('*.pipeline'); // delete pipeline files used for testing

    cy.bootstrapFile('invalid.pipeline');
    cy.bootstrapFile('generic-test.pipeline');
    cy.bootstrapFile('helloworld.ipynb');
    cy.exec('jupyter trust build/cypress-tests/helloworld.ipynb');
    cy.bootstrapFile('helloworld.py');
    cy.bootstrapFile('helloworld.r');
    cy.bootstrapFile('invalid.txt');

    cy.resetJupyterLab();
  });

  afterEach(() => {
    cy.deleteFile('helloworld.ipynb'); // delete notebook file used for testing
    cy.deleteFile('helloworld.py'); // delete python file used for testing
    cy.deleteFile('output.txt'); // delete output files generated by tests
    cy.deleteFile('*.pipeline'); // delete pipeline files used for testing
    cy.deleteFile('generic-test.yaml'); // exported pipeline
    cy.deleteFile('generic-test-custom.yaml'); // exported pipeline
    cy.deleteFile('generic-test.py'); // exported pipeline
    cy.deleteFile('invalid.txt');

    // delete complex test directories
    cy.deleteFile('pipelines');
    cy.deleteFile('scripts');

    // delete runtime configurations used for testing
    cy.exec('elyra-metadata remove runtimes --name=kfp_test_runtime', {
      failOnNonZeroExit: false
    });
    cy.exec('elyra-metadata remove runtimes --name=airflow_test_runtime', {
      failOnNonZeroExit: false
    });

    // delete example catalogs used for testing
    cy.exec(
      'elyra-metadata remove component-catalogs --name=example_components',
      {
        failOnNonZeroExit: false
      }
    );
  });

  // TODO: Fix Test is actually failing
  // it('empty editor should have disabled buttons', () => {
  //   cy.focusPipelineEditor();

  //   const disabledButtons = [
  //     '.run-action',
  //     '.export-action',
  //     '.clear-action',
  //     '.undo-action',
  //     '.redo-action',
  //     '.cut-action',
  //     '.copy-action',
  //     '.paste-action',
  //     '.deleteSelectedObjects-action',
  //     '.arrangeHorizontally-action',
  //     '.arrangeVertically-action'
  //   ];
  //   checkDisabledToolbarButtons(disabledButtons);

  //   const enabledButtons = [
  //     '.save-action',
  //     '.openRuntimes-action',
  //     '.createAutoComment-action'
  //   ];
  //   checkEnabledToolbarButtons(enabledButtons);

  //   closePipelineEditor();
  // });

  it('should block unsupported files', () => {
    cy.createPipeline();
    cy.dragAndDropFileToPipeline('invalid.txt');

    // check for unsupported files dialog message
    cy.findByText(/unsupported file/i).should('be.visible');

    // dismiss dialog
    cy.contains('OK').click();
  });

  it('populated editor should have enabled buttons', () => {
    cy.createPipeline();

    cy.checkTabMenuOptions('Pipeline');

    cy.addFileToPipeline('helloworld.ipynb'); // add Notebook
    cy.addFileToPipeline('helloworld.py'); // add Python Script
    cy.addFileToPipeline('helloworld.r'); // add R Script

    // check buttons
    const disabledButtons = [/redo/i, /cut/i, /copy/i, /paste/i, /delete/i];
    checkDisabledToolbarButtons(disabledButtons);

    const enabledButtons = [
      /run pipeline/i,
      /save pipeline/i,
      /export pipeline/i,
      /clear/i,
      /open runtimes/i,
      /open runtime images/i,
      /open component catalogs/i,
      /undo/i,
      /add comment/i,
      /arrange horizontally/i,
      /arrange vertically/i
    ];
    checkEnabledToolbarButtons(enabledButtons);
  });

  it('matches complex pipeline snapshot', () => {
    cy.bootstrapFile('pipelines/consumer.ipynb');
    cy.bootstrapFile('pipelines/create-source-files.py');
    cy.bootstrapFile('pipelines/producer-script.py');
    cy.bootstrapFile('pipelines/producer.ipynb');
    cy.bootstrapFile('scripts/setup.py');
    cy.bootstrapFile('scripts/setup.txt');

    // Do this all manually because our command doesn't support directories yet
    cy.openDirectory('pipelines');
    cy.writeFile('build/cypress-tests/pipelines/complex.pipeline', '');
    cy.openFile('complex.pipeline');
    cy.get('.common-canvas-drop-div');
    // wait an additional 300ms for the list of items to settle
    cy.wait(300);

    cy.addFileToPipeline('producer.ipynb');
    cy.addFileToPipeline('consumer.ipynb');

    cy.get('.jp-BreadCrumbs-home').click();
    cy.openDirectory('scripts');

    cy.addFileToPipeline('setup.py');

    cy.get('.jp-BreadCrumbs-home').click();
    cy.openDirectory('pipelines');

    cy.addFileToPipeline('create-source-files.py');
    cy.addFileToPipeline('producer-script.py');

    cy.get('#jp-main-dock-panel').within(() => {
      // producer props
      cy.findByText('producer.ipynb').rightclick();
      cy.findByRole('menuitem', { name: /properties/i }).click();
      cy.get('#root_component_parameters_filename').within(() => {
        cy.findByRole('button', { name: /browse/i }).click();
      });
    });

    cy.get('.elyra-browseFileDialog').within(() => {
      cy.openDirectory('producer.ipynb');
    });

    cy.get('#jp-main-dock-panel').within(() => {
      cy.get('#root_component_parameters_outputs').within(() => {
        cy.findByRole('button', { name: /add/i }).click();
        cy.get('input[id="root_component_parameters_outputs_0"]').type(
          'output-1.csv'
        );

        cy.findByRole('button', { name: /add/i }).click();
        cy.get('input[id="root_component_parameters_outputs_1"]').type(
          'output-2.csv'
        );
      });
      cy.get('#root_component_parameters_runtime_image').within(() => {
        cy.get('select[id="root_component_parameters_runtime_image"]').select(
          'continuumio/anaconda3:2021.11'
        );
      });

      // consumer props
      cy.findByText('consumer.ipynb').click();
      cy.get('#root_component_parameters_runtime_image').within(() => {
        cy.get('select[id="root_component_parameters_runtime_image"]').select(
          'continuumio/anaconda3:2021.11'
        );
      });

      // setup props
      cy.findByText('setup.py').click();
      cy.get('#root_component_parameters_runtime_image').within(() => {
        cy.get('select[id="root_component_parameters_runtime_image"]').select(
          'continuumio/anaconda3:2021.11'
        );
      });
      cy.get('#root_component_parameters_dependencies').within(() => {
        cy.findByRole('button', { name: /add/i }).click();
        cy.findByRole('button', { name: /browse/i }).click();
      });
    });

    // choosing dependencies happens outside of canvas
    cy.get('.elyra-browseFileDialog').within(() => {
      cy.openDirectory('setup.txt');
    });

    // back in canvas
    cy.get('#jp-main-dock-panel').within(() => {
      // create-source-files props
      cy.findByText('create-source-files.py').click();
      cy.get('#root_component_parameters_runtime_image').within(() => {
        cy.get('select[id="root_component_parameters_runtime_image"]').select(
          'continuumio/anaconda3:2021.11'
        );
      });
      cy.get('#root_component_parameters_outputs').within(() => {
        cy.findByRole('button', { name: /add/i }).click();
        cy.get('input[id="root_component_parameters_outputs_0"]').type(
          'input-1.csv'
        );

        cy.findByRole('button', { name: /add/i }).click();
        cy.get('input[id="root_component_parameters_outputs_1"]').type(
          'input-2.csv'
        );
      });

      // producer-script props
      cy.findByText('producer-script.py').click();
      cy.get('#root_component_parameters_runtime_image').within(() => {
        cy.get('select[id="root_component_parameters_runtime_image"]').select(
          'continuumio/anaconda3:2021.11'
        );
      });
      cy.get('#root_component_parameters_outputs').within(() => {
        cy.findByRole('button', { name: /add/i }).click();
        cy.get('input[id="root_component_parameters_outputs_0"]').type(
          'output-3.csv'
        );

        cy.findByRole('button', { name: /add/i }).click();
        cy.get('input[id="root_component_parameters_outputs_1"]').type(
          'output-4.csv'
        );
      });
    });

    cy.savePipeline();

    cy.readFile(
      'build/cypress-tests/pipelines/complex.pipeline'
    ).matchesSnapshot();
  });

  it('matches empty pipeline snapshot', () => {
    cy.createPipeline({ name: 'empty.pipeline' });

    cy.addFileToPipeline('helloworld.ipynb');

    cy.get('#jp-main-dock-panel').within(() => {
      cy.findByText('helloworld.ipynb').rightclick();
      cy.findByRole('menuitem', { name: /delete/i }).click();
    });

    cy.savePipeline();

    cy.readFile('build/cypress-tests/empty.pipeline').matchesSnapshot();
  });

  it('matches simple pipeline snapshot', () => {
    cy.createPipeline({ name: 'simple.pipeline' });

    cy.addFileToPipeline('helloworld.ipynb');

    cy.get('#jp-main-dock-panel').within(() => {
      cy.findByText('helloworld.ipynb');
    });

    cy.savePipeline();

    cy.readFile('build/cypress-tests/simple.pipeline').matchesSnapshot();
  });

  it('should open notebook on double-clicking the node', () => {
    // Open a pipeline in root directory
    cy.openFile('generic-test.pipeline');

    // Open notebook node with double-click
    cy.get('.common-canvas-drop-div').within(() => {
      cy.findByText('helloworld.ipynb').dblclick();
    });

    cy.findAllByRole('tab', { name: 'helloworld.ipynb' }).should('exist');

    // close tabs
    cy.closeTab(-1); // notebook tab
    cy.closeTab(-1); // pipeline tab

    // Open a pipeline in a subfolder
    cy.bootstrapFile('pipelines/producer.ipynb');
    cy.openDirectory('pipelines');
    cy.writeFile('build/cypress-tests/pipelines/complex.pipeline', '');
    cy.openFile('complex.pipeline');
    cy.get('.common-canvas-drop-div');
    cy.wait(300);
    cy.addFileToPipeline('producer.ipynb');
    cy.wait(300);

    // Open notebook node with double-click
    cy.get('#jp-main-dock-panel').within(() => {
      cy.findByText('producer.ipynb').dblclick();
    });

    cy.findAllByRole('tab', { name: 'producer.ipynb' }).should('exist');
  });

  it('should open notebook from node right-click menu', () => {
    // Open a pipeline in root directory
    cy.openFile('generic-test.pipeline');

    // Open notebook node with right-click menu
    cy.get('#jp-main-dock-panel').within(() => {
      cy.findByText('helloworld.ipynb').rightclick();
      cy.findByRole('menuitem', { name: /open file/i }).click();
    });

    cy.findAllByRole('tab', { name: 'helloworld.ipynb' }).should('exist');

    // close tabs
    cy.closeTab(-1); // notebook tab
    cy.closeTab(-1); // pipeline tab

    // Open a pipeline in a subfolder
    cy.bootstrapFile('pipelines/producer.ipynb');
    cy.openDirectory('pipelines');
    cy.writeFile('build/cypress-tests/pipelines/complex.pipeline', '');
    cy.openFile('complex.pipeline');
    cy.get('.common-canvas-drop-div');
    cy.wait(300);
    cy.addFileToPipeline('producer.ipynb');

    // Open notebook node with right-click menu
    cy.get('#jp-main-dock-panel').within(() => {
      cy.findByText('producer.ipynb').rightclick();
      cy.findByRole('menuitem', { name: /open file/i }).click();
    });

    cy.findAllByRole('tab', { name: 'producer.ipynb' }).should('exist');
  });

  it('should save runtime configuration', () => {
    cy.createPipeline();

    // Create kfp runtime configuration
    cy.createRuntimeConfig({ type: 'kfp' });

    // Create airflow runtime configuration
    cy.createRuntimeConfig({ type: 'airflow' });

    // validate runtimes are now available
    cy.get('#elyra-metadata\\:runtimes').within(() => {
      cy.findByText(/kfp test runtime/i).should('exist');
      cy.findByText(/airflow test runtime/i).should('exist');
    });
  });

  it('should fail to run invalid pipeline', () => {
    // opens pipeline from the file browser
    cy.openFile('invalid.pipeline');

    // try to run invalid pipeline
    cy.findByRole('button', { name: /run pipeline/i }).click();

    cy.findByText(/failed run:/i).should('be.visible');
  });

  // TODO: Investigate CI failures commented below
  // it('should run pipeline after adding runtime image', () => {
  //   cy.createPipeline();

  //   cy.addFileToPipeline('helloworld.ipynb'); // add Notebook

  //   cy.get('#jp-main-dock-panel').within(() => {
  //     cy.findByText('helloworld.ipynb').rightclick();

  //     cy.findByRole('menuitem', { name: /properties/i }).click();

  //     // Adds runtime image to new node
  //     // TODO we should use the `for` attribute for the label
  //     cy.get('#downshift-0-toggle-button').click();

  //     cy.findByRole('option', { name: /anaconda/i }).click();
  //   });

  //   cy.savePipeline();

  //   cy.findByRole('button', { name: /run pipeline/i }).click();

  //   cy.findByLabelText(/pipeline name/i).should('have.value', 'untitled');
  //   cy.findByLabelText(/runtime platform/i).should(
  //     'have.value',
  //     '__elyra_local__'
  //   );

  //   // execute
  //   cy.contains('OK').click();

  //   // validate job was executed successfully, this can take a while in ci
  //   cy.findByText(/job execution succeeded/i, { timeout: 30000 }).should(
  //     'be.visible'
  //   );
  //   // dismiss 'Job Succeeded' dialog
  //   cy.contains('OK').click();
  // });

  // it('should run pipeline with env vars and output files', () => {
  //   cy.openFile('generic-test.pipeline');

  //   cy.findByRole('button', { name: /run pipeline/i }).click();

  //   cy.findByLabelText(/pipeline name/i).should('have.value', 'generic-test');
  //   cy.findByLabelText(/runtime platform/i).should(
  //     'have.value',
  //     '__elyra_local__'
  //   );

  //   // execute
  //   cy.contains('OK').click();

  //   // validate job was executed successfully, this can take a while in ci
  //   cy.findByText(/job execution succeeded/i, { timeout: 30000 }).should(
  //     'be.visible'
  //   );
  //   // dismiss 'Job Succeeded' dialog
  //   cy.contains('OK').click();

  //   cy.readFile('build/cypress-tests/output.txt').should(
  //     'be.equal',
  //     'TEST_ENV_1=1\nTEST_ENV_2=2\n'
  //   );
  // });

  it('should fail to export invalid pipeline', () => {
    // Copy invalid pipeline

    cy.openFile('invalid.pipeline');

    cy.findByRole('button', { name: /export pipeline/i }).click();

    cy.findByText(/failed export:/i).should('be.visible');
  });

  it('should export KFP pipeline as yaml', () => {
    // Install runtime configuration
    cy.installRuntimeConfig({ type: 'kfp' });

    cy.openFile('generic-test.pipeline');

    // try to export valid pipeline
    cy.findByRole('button', { name: /export pipeline/i }).click();

    // check label for generic pipeline
    cy.get('.jp-Dialog-header').contains('Export pipeline');

    cy.findByLabelText(/runtime platform/i).select('KUBEFLOW_PIPELINES');

    cy.findByLabelText(/runtime configuration/i)
      .select('kfp_test_runtime')
      .should('have.value', 'kfp_test_runtime');

    // Validate all export options are available
    cy.findByLabelText(/export pipeline as/i)
      .select('KFP static configuration file (YAML formatted)')
      .should('have.value', 'yaml');

    // actual export requires minio
    cy.contains('OK').click();

    // validate job was executed successfully, this can take a while in ci
    cy.findByText(/pipeline export succeeded/i, { timeout: 30000 }).should(
      'be.visible'
    );

    cy.readFile('build/cypress-tests/generic-test.yaml');
  });

  it('should export KFP pipeline as Python DSL', () => {
    // Install runtime configuration
    cy.installRuntimeConfig({ type: 'kfp' });

    cy.openFile('generic-test.pipeline');

    // try to export valid pipeline
    cy.findByRole('button', { name: /export pipeline/i }).click();

    // check label for generic pipeline
    cy.get('.jp-Dialog-header').contains('Export pipeline');

    cy.findByLabelText(/runtime platform/i).select('KUBEFLOW_PIPELINES');

    cy.findByLabelText(/runtime configuration/i)
      .select('kfp_test_runtime')
      .should('have.value', 'kfp_test_runtime');

    // Validate all export options are available
    cy.findByLabelText(/export pipeline as/i)
      .select('Python DSL')
      .should('have.value', 'py');

    // actual export requires minio
    cy.contains('OK').click();

    // validate job was executed successfully, this can take a while in ci
    cy.findByText(/pipeline export succeeded/i, { timeout: 30000 }).should(
      'be.visible'
    );

    cy.readFile('build/cypress-tests/generic-test.py');
  });

  it('should export Airflow pipeline as python dsl', () => {
    // Install runtime configuration
    cy.installRuntimeConfig({ type: 'airflow' });

    cy.openFile('generic-test.pipeline');

    // try to export valid pipeline
    cy.findByRole('button', { name: /export pipeline/i }).click();

    // check label for generic pipeline
    cy.get('.jp-Dialog-header').contains('Export pipeline');

    cy.findByLabelText(/runtime platform/i).select('APACHE_AIRFLOW');

    cy.findByLabelText(/runtime configuration/i)
      .select('airflow_test_runtime')
      .should('have.value', 'airflow_test_runtime');

    // overwrite existing genric-test.py file
    cy.findByLabelText(/export pipeline as/i)
      .select('Airflow domain-specific language Python code')
      .should('have.value', 'py');

    cy.findByLabelText(/replace if file already exists/i)
      .check()
      .should('be.checked');

    // actual export requires minio
    cy.contains('OK').click();

    // validate job was executed successfully, this can take a while in ci
    cy.findByText(/pipeline export succeeded/i, { timeout: 30000 }).should(
      'be.visible'
    );

    cy.readFile('build/cypress-tests/helloworld.py');
  });

  it('should export pipeline with custom filename', () => {
    // Install runtime configuration
    cy.installRuntimeConfig({ type: 'kfp' });

    cy.openFile('generic-test.pipeline');

    // try to export valid pipeline
    cy.findByRole('button', { name: /export pipeline/i }).click();

    // check label for generic pipeline
    cy.get('.jp-Dialog-header').contains('Export pipeline');

    cy.findByLabelText(/runtime platform/i).select('KUBEFLOW_PIPELINES');

    cy.findByLabelText(/runtime configuration/i)
      .select('kfp_test_runtime')
      .should('have.value', 'kfp_test_runtime');

    // Validate all export options are available
    cy.findByLabelText(/export pipeline as/i)
      .select('KFP static configuration file (YAML formatted)')
      .should('have.value', 'yaml');

    // customize filename by appending "-custom"
    cy.findByLabelText(/export filename/i).type('-custom');

    // actual export requires minio
    cy.contains('OK').click();

    // validate job was executed successfully, this can take a while in ci
    cy.findByText(/pipeline export succeeded/i, { timeout: 30000 }).should(
      'be.visible'
    );

    cy.readFile('build/cypress-tests/generic-test-custom.yaml');
  });

  it('should not leak properties when switching between nodes', () => {
    cy.openFile('generic-test.pipeline');

    cy.get('#jp-main-dock-panel').within(() => {
      cy.findByText('helloworld.ipynb').rightclick();

      cy.findByRole('menuitem', { name: /properties/i }).click();

      cy.get('input[value="TEST_ENV_1"]').should('exist');
      cy.get('input[value="1"]').should('exist');

      cy.findByText('helloworld.py').click();

      cy.get('#root_component_parameters_env_vars').within(() => {
        cy.findByRole('button', { name: /add/i }).click();
        cy.get('input[id="root_component_parameters_env_vars_0_env_var"]').type(
          'BAD'
        );
        cy.get('input[id="root_component_parameters_env_vars_0_value"]').type(
          'two'
        );
      });

      cy.get('input[value="BAD"]').should('exist');
      cy.get('input[value="two"]').should('exist');

      cy.findByText('helloworld.ipynb').click();

      cy.get('input[value="TEST_ENV_1"]').should('exist');
      cy.get('input[value="1"]').should('exist');
      cy.get('input[value="BAD"]').should('not.exist');
      cy.get('input[value="two"]').should('not.exist');

      cy.findByText('helloworld.py').click();

      cy.get('input[value="BAD"]').should('exist');
      cy.get('input[value="two"]').should('exist');
    });
  });

  it('kfp pipeline should display custom components', () => {
    cy.createExampleComponentCatalog({ type: 'kfp' });

    cy.createPipeline({ type: 'kfp' });
    cy.get('.palette-flyout-category[value="examples"]').click();

    const kfpCustomComponents = [
      'elyra-kfp-examples-catalog\\:61e6f4141f65', // run notebook using papermill
      'elyra-kfp-examples-catalog\\:737915b826e9', // filter text
      'elyra-kfp-examples-catalog\\:a08014f9252f', // download data
      'elyra-kfp-examples-catalog\\:d68ec7fcdf46' // calculate data hash
    ];

    kfpCustomComponents.forEach(component => {
      cy.get(`#${component}`).should('exist');
    });
  });

  it('kfp pipeline should display expected export options', () => {
    cy.createPipeline({ type: 'kfp' });
    cy.savePipeline();

    cy.installRuntimeConfig({ type: 'kfp' });

    // Validate all export options are available
    cy.findByRole('button', { name: /export pipeline/i }).click();
    cy.findByRole('option', { name: /yaml/i }).should('have.value', 'yaml');
    cy.findByRole('option', { name: /python/i }).should('have.value', 'py');

    // Dismiss dialog
    cy.findByRole('button', { name: /cancel/i }).click();
  });

  it('airflow pipeline should display expected export options', () => {
    cy.createPipeline({ type: 'airflow' });
    cy.savePipeline();

    cy.installRuntimeConfig({ type: 'airflow' });

    // Validate all export options are available
    cy.findByRole('button', { name: /export pipeline/i }).click();
    cy.findByRole('option', { name: /python/i }).should('have.value', 'py');
    cy.findByRole('option', { name: /yaml/i }).should('not.exist');

    // Dismiss dialog
    cy.findByRole('button', { name: /cancel/i }).click();
  });

  //error dialog tests
  it('saving runtime config with missing required fields should error', () => {
    cy.createRuntimeConfig({ type: 'invalid' });
    cy.get('.jp-Dialog-header').contains('Error making request');

    // Dismiss dialog
    cy.findByRole('button', { name: /ok/i }).click();
  });

  it('exporting generic pipeline with invalid runtime config should produce request error', () => {
    cy.createPipeline();
    cy.savePipeline();

    cy.installRuntimeConfig();

    cy.findByRole('button', { name: /export pipeline/i }).click();

    cy.contains('OK').click();

    cy.get('.jp-Dialog-header').contains('Error making request');

    // Dismiss dialog
    cy.findByRole('button', { name: /ok/i }).click();
  });

  it('generic pipeline should display expected export options', () => {
    cy.createPipeline();
    cy.savePipeline();

    // Test Airflow export options
    cy.installRuntimeConfig({ type: 'airflow' });

    cy.findByRole('button', { name: /export pipeline/i }).click();

    // Validate all export options are available for airflow
    cy.findByLabelText(/runtime platform/i).select('APACHE_AIRFLOW');
    cy.findByRole('option', { name: /python/i }).should('have.value', 'py');
    cy.findByRole('option', { name: /yaml/i }).should('not.exist');

    // Dismiss dialog
    cy.findByRole('button', { name: /cancel/i }).click();

    // Test KFP export options
    cy.installRuntimeConfig({ type: 'kfp' });

    cy.findByRole('button', { name: /export pipeline/i }).click();

    // Validate all export options are available for kfp
    cy.findByLabelText(/runtime platform/i).select('KUBEFLOW_PIPELINES');
    cy.findByRole('option', { name: /yaml/i }).should('have.value', 'yaml');
    cy.findByRole('option', { name: /python/i }).should('have.value', 'py');

    // Dismiss dialog
    cy.findByRole('button', { name: /cancel/i }).click();
  });

  it('generic pipeline toolbar should display expected runtime', () => {
    cy.createPipeline();
    cy.get('.toolbar-icon-label').contains(/runtime: generic/i);
  });

  it('kfp pipeline toolbar should display expected runtime', () => {
    cy.createPipeline({ type: 'kfp' });
    cy.get('.toolbar-icon-label').contains(/runtime: kubeflow pipelines/i);
  });

  it('airflow pipeline toolbar should display expected runtime', () => {
    cy.createPipeline({ type: 'airflow' });
    cy.get('.toolbar-icon-label').contains(/runtime: apache airflow/i);
  });
});

// ------------------------------
// ----- Utility Functions
// ------------------------------

const checkEnabledToolbarButtons = (buttons: RegExp[]): void => {
  for (const button of buttons) {
    cy.findByRole('button', { name: button }).should('not.be.disabled');
  }
};

const checkDisabledToolbarButtons = (buttons: RegExp[]): void => {
  for (const button of buttons) {
    cy.findByRole('button', { name: button }).should('be.disabled');
  }
};
