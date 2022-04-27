export default function newPostRequestOptions(xCSRFToken: string): any {
  return {
    headers: {
      accept: 'application/json, text/plain, */*',
      'content-type': 'application/json;charset=UTF-8',
      'x-csrf-token': xCSRFToken,
    },
    method: 'POST',
    credentials: 'include',
  };
}
