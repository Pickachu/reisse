// Eventually delete this file

// To boot thigs, load use model
// model = await use.load();

app.DEFAULT_OCURRENCE_SET_SIZE = 15000;
await Promise.all([app.fetch()])

// TODO create pt-br vocabulary to use with use embeddings or
// translate all tasks to english
embeddings = await model.embed(app.ocurrences.map(({name}) => name));

// Perform principal component analysis on embeddings

// Perform clustering with spectral-net
- continue to convert to unsupervised: https://github.com/KlugerLab/SpectralNet/issues/5
