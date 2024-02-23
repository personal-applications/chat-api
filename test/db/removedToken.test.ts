import assert from "node:assert";
import test from "node:test";
import Sinon from "sinon";
import removedTokenQueries from "../../src/modules/db/removedToken";

test("RevokedToken queries", async (t) => {
  const fakePrisma = {
    removedToken: {
      findFirst: Sinon.stub().resolves(),
      create: Sinon.stub().resolves(),
    },
  };
  await t.test("find", async () => {
    await removedTokenQueries.find(fakePrisma as any, "hash");

    assert(fakePrisma.removedToken.findFirst.calledOnce);
  });

  await t.test("create", async () => {
    await removedTokenQueries.create(fakePrisma as any, "token");

    assert(fakePrisma.removedToken.create.calledOnce);
  });
});
