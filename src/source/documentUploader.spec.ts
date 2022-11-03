// TODO: when calling with fileStrategy
// TODO: when calling with stream strategy

// describe('when createFields option is set to true', () => {
//   it.todo('should call Field Analyser');
//   it.todo('should call #createFieldsFromReport');
// });

// it('should create a file container', async () => {
//   await uploadBatch('the_id', batch, {
//     createFields: false,
//   });
//   expect(mockAxios.post).toHaveBeenCalledWith(
//     'https://api.cloud.coveo.com/push/v1/organizations/the_org/files',
//     expect.objectContaining({}),
//     expectedDocumentsHeaders
//   );
// });

// it('should upload files to container with returned upload uri and required headers ', async () => {
//   await uploadBatch('the_id', batch, {
//     createFields: false,
//   });
//   expect(mockAxios.put).toHaveBeenCalledWith(
//     'https://fake.upload.url/',
//     expect.objectContaining({
//       addOrUpdate: expect.arrayContaining([
//         expect.objectContaining({documentId: 'the_uri_1'}),
//         expect.objectContaining({documentId: 'the_uri_2'}),
//       ]),
//       delete: expect.arrayContaining([
//         expect.objectContaining({documentId: 'the_uri_3'}),
//       ]),
//     }),
//     {headers: {foo: 'bar'}, maxBodyLength: 256e6}
//   );
// });

// it('should push content to source with returned fileId', async () => {
//   await uploadBatch('the_id', batch, {
//     createFields: false,
//   });
//   expect(mockAxios.put).toHaveBeenCalledWith(
//     'https://api.cloud.coveo.com/push/v1/organizations/the_org/sources/the_id/documents/batch?fileId=file_id',
//     {},
//     expectedDocumentsHeaders
//   );
// });
