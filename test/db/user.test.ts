import { assert } from "node:console";
import test from "node:test";
import Sinon from "sinon";
import userQueries from "../../src/modules/db/user";

test("User queries", async (t) => {
  const fakePrisma = {
    user: {
      create: Sinon.stub().resolves(),
      update: Sinon.stub().resolves(),
      findFirst: Sinon.stub().resolves(),
      findMany: Sinon.stub().resolves(),
    },
  };

  await t.test("create", async () => {
    await userQueries.create(fakePrisma as any, { email: "email@email.com", password: "password", firstName: "firstName", lastName: "lastName" });

    assert(fakePrisma.user.create.calledOnce);
  });

  await t.test("update", async () => {
    await userQueries.update(fakePrisma as any, { email: "email@email.com" }, { password: "123" });

    assert(fakePrisma.user.update.calledOnce);
  });

  await t.test("findFirst", async () => {
    await userQueries.findFirst(fakePrisma as any, { email: "email@email.com" });

    assert(fakePrisma.user.findFirst.calledOnce);
  });

  await t.test("findMany", async () => {
    await userQueries.findMany(fakePrisma as any, { email: "email@email.com" }, { id: true });

    assert(fakePrisma.user.findMany.calledOnce);
  });
});
