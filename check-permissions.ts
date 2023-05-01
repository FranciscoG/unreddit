// as of Deno v1.32.2
type PermissionNames = Parameters<typeof Deno.permissions.query>[0]["name"];
// "run" | "read" | "write" | "net" | "env" | "sys" | "ffi" | "hrtime"

/**
 * Checks to see if you are providing a list to those permissions that can take a list
 * @returns an error string if there were any premissions being improperly used, undefined if everthing is ok
 */
async function checkPermissionsWithLists(): Promise<string | void> {
  const permissions: PermissionNames[] = [
    "env",
    "run",
    "net",
    "write",
    "read",
    "sys",
    "ffi",
  ];
  const granted = [];

  for (const permission of permissions) {
    const { state } = await Deno.permissions.query({ name: permission });
    // if you use a flag without an allow-list, state will show as 'granted'
    // but if you do use an allow-list, state will show as 'prompt'
    if (state === "granted") {
      granted.push(permission);
    }
  }

  if (granted.length > 0) {
    const formatted = granted.map((p) => `\t--allow-${p}`).join("\n");
    return `ERROR: No opened ended permissions allowed.\nYou must use an allow list for the following permissions:\n${formatted}`;
  }
}

/**
 * Checks to see if you are using --allow-hrtime
 * @returns an error string if permission is being used, undefined if everthing is ok
 */
async function checkHrtime(): Promise<string | void> {
  const { state } = await Deno.permissions.query({ name: "hrtime" });
  if (state === "granted") {
    return `Restricted use of 'hrtime'. Please remove --allow-hrtime`;
  }
}

const errorMessages = await Promise.all([
  checkPermissionsWithLists(),
  checkHrtime(),
]);

let hasError = false;
errorMessages.forEach((msg) => {
  if (typeof msg === "string") {
    hasError = true;
    console.error(msg);
  }
});

if (hasError) {
  Deno.exit(1);
}
