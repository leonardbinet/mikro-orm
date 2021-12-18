import { Entity, MikroORM, OneToOne, PrimaryKey } from '@mikro-orm/core';
import type { SqliteDriver } from '@mikro-orm/sqlite';

@Entity()
export class First {

  @PrimaryKey()
  id!: number;

  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  @OneToOne(() => Second, second => second.first)
  second?: any;

}

@Entity()
export class Second {

  @PrimaryKey()
  id!: number;

  @OneToOne(() => First)
  first!: First;

  constructor(first: First) {
    this.first = first;
  }

}

describe('GH issue 2238', () => {
  let orm: MikroORM<SqliteDriver>;

  beforeAll(async () => {
    orm = await MikroORM.init({
      entities: [First, Second],
      dbName: ':memory:',
      type: 'sqlite',
    });
    await orm.getSchemaGenerator().createSchema();
  });

  afterAll(() => orm.close(true));

  test('flush after removeAndFlush', async () => {
    const a = new First();
    const b = new Second(a);
    orm.em.persist([a, b]);
    await orm.em.flush();
    orm.em.clear();

    const seconds = await orm.em.find(Second, {});
    await orm.em.removeAndFlush(seconds);
    const result1 = await orm.em.find(Second, {});
    expect(result1.length).toBe(0);
    await orm.em.flush();
    const result2 = await orm.em.find(Second, {});
    expect(result2.length).toBe(0);
    const result3 = await orm.em.find(First, {});
    expect(result3.length).toBe(1);
  });
});