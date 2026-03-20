const { execSync } = require('child_process');
try {
  const ps = execSync('powershell "Get-Process | Where-Object { $_.ProcessName -like \'*node*\' } | Select-Object Id, ProcessName"').toString();
  console.log('--- Node Processes ---');
  console.log(ps);
} catch (e) {
  console.error(e);
}
