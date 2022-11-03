// TODO:

// import { FileContainerStrategy } from "./fileContainerStrategy";

// describe('FileContainerStrategy', () => {
//   it('should upload documents from local file', async () => {
//     const urlBuilder = n
//     new FileContainerStrategy()
//     await source
//       .batchUpdateDocumentsFromFiles(
//         'the_id',
//         [join(pathToStub, 'mixdocuments')],
//         {createFields: false}
//       )
//       .batch();

//     expect(mockAxios.put).toHaveBeenCalledWith(
//       'https://fake.upload.url/',
//       expect.objectContaining({
//         addOrUpdate: expect.arrayContaining([
//           expect.objectContaining({
//             documentId: 'https://www.themoviedb.org/movie/268',
//           }),
//           expect.objectContaining({
//             documentId: 'https://www.themoviedb.org/movie/999',
//           }),
//         ]),
//         delete: expect.arrayContaining([]),
//       }),
//       {
//         headers: {
//           foo: 'bar',
//         },
//         maxBodyLength: 256e6,
//       }
//     );
//   });
// });
