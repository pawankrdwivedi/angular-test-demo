When npm run test:cucumber is executed no test case got executed
When npm run test:cucumber:tag -- "@ui" no test case gets executed
When npm run test:cucumber:feature -- features/feature/demo_angular_ui.feature test case got executed but there is no feature file is in this location.
When npm run test:playwright is executed it is running test cases on 4 parallel worker. this value should come from .env file PARALLEL variable.
Alos remove apptimeout, timeoutout hard coing from both folders app and framework this value should come from TIMEOUT variable from .env file in app folder