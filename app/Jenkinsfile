pipeline {
    agent {
        docker {
            image 'mcr.microsoft.com/playwright:v1.44.1-noble'
            args '-v /var/run/docker.sock:/var/run/docker.sock'
        }
    }

    parameters {
        choice(name: 'TEST_ENV', choices: ['qa', 'dev', 'uat', 'prod'], description: 'Target environment for automation execution')
        string(name: 'CUCUMBER_TAGS', defaultValue: '', description: 'Cucumber tags to filter execution (e.g. @smoke)')
    }

    options {
        timeout(time: 1, unit: 'HOURS')
        ansiColor('xterm')
    }

    stages {
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
                sh 'npx playwright install --with-deps'
            }
        }

        stage('Execute Automation') {
            steps {
                script {
                    def tagArg = params.CUCUMBER_TAGS ? " --tags \"${params.CUCUMBER_TAGS}\"" : ""
                    sh "npm run test -- --env=${params.TEST_ENV}${tagArg}"
                }
            }
        }

        stage('Reporting') {
            steps {
                // Generate and publish allure report
                script {
                    try {
                        sh 'npm run allure:generate'
                        allure includeProperties: false, jdk: '', results: [[path: 'test_results/allure-results']]
                    } catch (Exception e) {
                        echo "Failed to generate Allure Report: ${e.message}"
                    }
                }
            }
        }
    }

    post {
        always {
            // Archive screenshots, videos, and traces
            archiveArtifacts artifacts: 'test_results/reports/**/*', allowEmptyArchive: true
            
            // Standard Cucumber HTML report archival
            publishHTML([
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'test_results/reports',
                reportFiles: 'cucumber-report.html',
                reportName: 'Cucumber BDD Execution Report',
                reportTitles: 'Cucumber Report'
            ])
        }
        success {
            echo 'Test Execution Completed Successfully!'
        }
        failure {
            echo 'Test Execution Failed! Check reports for logs, traces, and screenshots.'
        }
    }
}
