// Test de l'API checkout



(async () => {
    // requête POST à l'API checkout /init
    const response = await fetch('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ action: 'init' })
    });
    const data = await response.json();
    console.log(data);

});