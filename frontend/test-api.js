const fetch = require('node-fetch');

async function test() {
  try {
    const res = await fetch('http://127.0.0.1:5000/');
    const data = await res.json();
    console.log('Success:', data);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
