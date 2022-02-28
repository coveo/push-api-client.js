class Performance {
  private hrstart: [number, number];
  private used: number;

  public constructor(private title: string) {
    this.hrstart = process.hrtime();
    this.used = process.memoryUsage().heapUsed / 1024 / 1024;
  }

  public inspect() {
    this.used = Math.max(
      this.used,
      process.memoryUsage().heapUsed / 1024 / 1024
    );
  }

  public stop() {
    const hrend = process.hrtime(this.hrstart);
    console.info(
      `${this.title}
       - Execution time: ${hrend[0]}s, ${hrend[1] / 1000000}ms
       - Memory usage  : ${Math.round(this.used * 100) / 100} MB`
    );
  }
}

export default new Performance('global');
