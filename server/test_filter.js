async function test() {
  const url1 = 'http://localhost:3001/api/pgs?city=Bangalore&max_price=15000';
  try {
    let res = await fetch(url1);
    let data = await res.json();
    console.log("PGs:", data.data.map(p => p.name + " (Rent: " + p.monthly_rent_min + ", City: " + p.city + ")"));
  } catch(e) { console.error(e) }
}
test();
