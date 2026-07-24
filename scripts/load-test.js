const http = require('http');

const numStudents = parseInt(process.argv.find((a) => a.startsWith('--students='))?.split('=')[1] || '20', 10);
const durationSec = parseInt(process.argv.find((a) => a.startsWith('--duration='))?.split('=')[1] || '5', 10);

console.log('====================================================');
console.log('  CUSTECH Osara — High-Concurrency Load Simulator');
console.log('====================================================');
console.log(`Config: ${numStudents} Virtual Students | ${durationSec} Seconds Duration\n`);

let totalRequests = 0;
let totalSuccess = 0;
let totalErrors = 0;
const latencies = [];

const sendHealthRequest = () => {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.get('http://localhost:5000/api/health', (res) => {
      const elapsed = Date.now() - start;
      latencies.push(elapsed);
      totalRequests++;
      if (res.statusCode === 200) {
        totalSuccess++;
      } else {
        totalErrors++;
      }
      resolve();
    });
    req.on('error', () => {
      totalRequests++;
      totalErrors++;
      resolve();
    });
    req.end();
  });
};

const runLoadTest = async () => {
  const startTime = Date.now();
  const endTime = startTime + durationSec * 1000;

  const virtualStudents = Array.from({ length: numStudents }).map(async (_, idx) => {
    while (Date.now() < endTime) {
      await sendHealthRequest();
      await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
    }
  });

  await Promise.all(virtualStudents);

  const totalTimeSec = (Date.now() - startTime) / 1000;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const reqPerSec = (totalRequests / totalTimeSec).toFixed(1);

  console.log('----------------------------------------------------');
  console.log('  Load Test Execution Summary');
  console.log('----------------------------------------------------');
  console.log(`  Total Requests Executed: ${totalRequests}`);
  console.log(`  Successful Responses:    ${totalSuccess}`);
  console.log(`  Failed/Errored:          ${totalErrors}`);
  console.log(`  Throughput Rate:         ${reqPerSec} req/sec`);
  console.log(`  Latency Metrics:         p50: ${p50}ms | p95: ${p95}ms | p99: ${p99}ms`);
  console.log('----------------------------------------------------\n');
};

runLoadTest().catch((err) => console.error('Load test error:', err));
