import {consumeGenerator} from './generator';
import {nextTick} from 'process';

describe('generator', () => {
  const maxConcurrent = 2;
  const buildPromise = (id: number) => () =>
    new Promise<number>((resolve) => {
      nextTick(() => resolve(id));
    });
  const taskMatrix = [
    [buildPromise(5), buildPromise(6)],
    [buildPromise(1), buildPromise(2), buildPromise(3)],
    [buildPromise(4)],
  ];
  /**
   * The promises should be consumed in this order:
   *  5 6 1 2 3 4
   *
   * And distributed to the workers in this manner:
   *  Worker 1 : 5 1 3
   *  Worker 2 : 6 2 4
   */

  const generator = function* () {
    for (const taskList of taskMatrix) {
      // Flattening first dimension of the task matrix
      for (const task of taskList) {
        // Flattening second dimension of the task matrix
        yield task();
      }
    }
  };

  const asyncGenerator = async function* () {
    yield* generator();
  };

  const callback = jest.fn();
  const callSequence: [worker: number, promiseId: number][] = [
    [0, 5],
    [0, 1],
    [0, 3],
    [1, 6],
    [1, 2],
    [1, 4],
  ];

  it('should consume a generator', async () => {
    await consumeGenerator(generator, maxConcurrent, callback);
    callSequence.forEach((step) => {
      expect(callback).toHaveBeenCalledWith(step[0], step[1]);
    });
  });

  it('should consume an async generator', async () => {
    await consumeGenerator(asyncGenerator, maxConcurrent, callback);
    callSequence.forEach((step) => {
      expect(callback).toHaveBeenCalledWith(step[0], step[1]);
    });
  });
});
