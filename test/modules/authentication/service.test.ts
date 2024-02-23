import assert from "node:assert";
import test from "node:test";
import Sinon from "sinon";
import authenticationService from "../../../src/modules/authentication/service";
import removedTokenQueries from "../../../src/modules/db/removedToken";

test("Authentication service", async (t) => {
  const removedTokenQueriesStub = Sinon.stub(removedTokenQueries);

  await t.test("isTokenRevoked", async () => {
    authenticationService.isTokenRevoked({} as any, "hash");

    assert(removedTokenQueriesStub.find.calledOnce);
  });

  await t.test("revokeToken", async () => {
    authenticationService.revokeToken({} as any, "token");

    assert(removedTokenQueriesStub.create.calledOnce);
  });
});
