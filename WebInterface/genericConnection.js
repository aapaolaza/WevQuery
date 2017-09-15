
const genericConnection = createGenericConnectionFunctions();

function createGenericConnectionFunctions() {
  const genericConnectionObject = {};

  return genericConnectionObject;
}


/**
 * Pattern mining results are received from server
 * {data.title, data.results}
 */
socket.on('clientPatternResultsReady', (data) => {
  notifyUser(`${data.title} finished processing, ${data.isError}`);
  console.log(data);
  genericFunctions.addPatternResult(data);
  genericFunctions.resetTabHeader();
});
