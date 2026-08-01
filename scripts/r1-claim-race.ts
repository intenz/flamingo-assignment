/**
 * R1 concurrency verification stub.
 * Step 3.5 will hit the running app with N parallel claim requests
 * against one open item and assert exactly one winner.
 *
 * Usage (later): npm run test:r1   (requires npm run dev)
 */
async function main() {
  console.log(
    "R1 claim-race script is a stub — implement in step 3.5 after claim API exists.",
  );
  process.exitCode = 0;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
