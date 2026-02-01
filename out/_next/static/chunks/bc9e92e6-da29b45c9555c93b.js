"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[358],{19009:function(e,t,n){n.d(t,{Bt:function(){return sx},ET:function(){return sN},IO:function(){return so},JU:function(){return iL},PL:function(){return sI},Xo:function(){return sd},ad:function(){return iF},ar:function(){return su},cf:function(){return sk},hJ:function(){return ix},oe:function(){return sS},pl:function(){return sC},qs:function(){return sL},r7:function(){return sA}});var r,i,s,a,o=n(95723),l=n(95893),u=n(9858),c=n(38954),h=n(38597),d=n(92841);n(49079);var f=n(8620).Buffer;let m="@firebase/firestore";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class g{isAuthenticated(){return null!=this.uid}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}constructor(e){this.uid=e}}g.UNAUTHENTICATED=new g(null),g.GOOGLE_CREDENTIALS=new g("google-credentials-uid"),g.FIRST_PARTY=new g("first-party-uid"),g.MOCK_USER=new g("mock-user");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let p="10.14.0",y=new u.Yd("@firebase/firestore");function v(){return y.logLevel}function w(e){for(var t=arguments.length,n=Array(t>1?t-1:0),r=1;r<t;r++)n[r-1]=arguments[r];if(y.logLevel<=u.in.DEBUG){let t=n.map(T);y.debug("Firestore (".concat(p,"): ").concat(e),...t)}}function _(e){for(var t=arguments.length,n=Array(t>1?t-1:0),r=1;r<t;r++)n[r-1]=arguments[r];if(y.logLevel<=u.in.ERROR){let t=n.map(T);y.error("Firestore (".concat(p,"): ").concat(e),...t)}}function E(e){for(var t=arguments.length,n=Array(t>1?t-1:0),r=1;r<t;r++)n[r-1]=arguments[r];if(y.logLevel<=u.in.WARN){let t=n.map(T);y.warn("Firestore (".concat(p,"): ").concat(e),...t)}}function T(e){if("string"==typeof e)return e;try{/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */return JSON.stringify(e)}catch(t){return e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function I(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"Unexpected state",t="FIRESTORE (".concat(p,") INTERNAL ASSERTION FAILED: ")+e;throw _(t),Error(t)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let C={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class A extends c.ZR{constructor(e,t){super(e,t),this.code=e,this.message=t,this.toString=()=>"".concat(this.name,": [code=").concat(this.code,"]: ").concat(this.message)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class S{constructor(){this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class N{constructor(e,t){this.user=t,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization","Bearer ".concat(e))}}class k{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,t){e.enqueueRetryable(()=>t(g.UNAUTHENTICATED))}shutdown(){}}class b{getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,t){this.changeListener=t,e.enqueueRetryable(()=>t(this.token.user))}shutdown(){this.changeListener=null}constructor(e){this.token=e,this.changeListener=null}}class D{start(e,t){void 0===this.o||I();let n=this.i,r=e=>this.i!==n?(n=this.i,t(e)):Promise.resolve(),i=new S;this.o=()=>{this.i++,this.currentUser=this.u(),i.resolve(),i=new S,e.enqueueRetryable(()=>r(this.currentUser))};let s=()=>{let t=i;e.enqueueRetryable(async()=>{await t.promise,await r(this.currentUser)})},a=e=>{w("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=e,this.o&&(this.auth.addAuthTokenListener(this.o),s())};this.t.onInit(e=>a(e)),setTimeout(()=>{if(!this.auth){let e=this.t.getImmediate({optional:!0});e?a(e):(w("FirebaseAuthCredentialsProvider","Auth not yet detected"),i.resolve(),i=new S)}},0),s()}getToken(){let e=this.i,t=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(t).then(t=>this.i!==e?(w("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):t?("string"==typeof t.accessToken||I(),new N(t.accessToken,this.currentUser)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){let e=this.auth&&this.auth.getUid();return null===e||"string"==typeof e||I(),new g(e)}constructor(e){this.t=e,this.currentUser=g.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}}class R{T(){return this.P?this.P():null}get headers(){this.I.set("X-Goog-AuthUser",this.l);let e=this.T();return e&&this.I.set("Authorization",e),this.h&&this.I.set("X-Goog-Iam-Authorization-Token",this.h),this.I}constructor(e,t,n){this.l=e,this.h=t,this.P=n,this.type="FirstParty",this.user=g.FIRST_PARTY,this.I=new Map}}class x{getToken(){return Promise.resolve(new R(this.l,this.h,this.P))}start(e,t){e.enqueueRetryable(()=>t(g.FIRST_PARTY))}shutdown(){}invalidateToken(){}constructor(e,t,n){this.l=e,this.h=t,this.P=n}}class L{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class V{start(e,t){void 0===this.o||I();let n=e=>{null!=e.error&&w("FirebaseAppCheckTokenProvider","Error getting App Check token; using placeholder token instead. Error: ".concat(e.error.message));let n=e.token!==this.R;return this.R=e.token,w("FirebaseAppCheckTokenProvider","Received ".concat(n?"new":"existing"," token.")),n?t(e.token):Promise.resolve()};this.o=t=>{e.enqueueRetryable(()=>n(t))};let r=e=>{w("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=e,this.o&&this.appCheck.addTokenListener(this.o)};this.A.onInit(e=>r(e)),setTimeout(()=>{if(!this.appCheck){let e=this.A.getImmediate({optional:!0});e?r(e):w("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}},0)}getToken(){let e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then(e=>e?("string"==typeof e.token||I(),this.R=e.token,new L(e.token)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}constructor(e){this.A=e,this.forceRefresh=!1,this.appCheck=null,this.R=null}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class M{static newId(){let e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=Math.floor(256/e.length)*e.length,n="";for(;n.length<20;){let r=/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function(e){let t="undefined"!=typeof self&&(self.crypto||self.msCrypto),n=new Uint8Array(e);if(t&&"function"==typeof t.getRandomValues)t.getRandomValues(n);else for(let t=0;t<e;t++)n[t]=Math.floor(256*Math.random());return n}(40);for(let i=0;i<r.length;++i)n.length<20&&r[i]<t&&(n+=e.charAt(r[i]%e.length))}return n}}function O(e,t){return e<t?-1:e>t?1:0}function F(e,t,n){return e.length===t.length&&e.every((e,r)=>n(e,t[r]))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class P{static now(){return P.fromMillis(Date.now())}static fromDate(e){return P.fromMillis(e.getTime())}static fromMillis(e){let t=Math.floor(e/1e3);return new P(t,Math.floor(1e6*(e-1e3*t)))}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/1e6}_compareTo(e){return this.seconds===e.seconds?O(this.nanoseconds,e.nanoseconds):O(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{seconds:this.seconds,nanoseconds:this.nanoseconds}}valueOf(){return String(this.seconds- -62135596800).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}constructor(e,t){if(this.seconds=e,this.nanoseconds=t,t<0||t>=1e9)throw new A(C.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(e<-62135596800||e>=253402300800)throw new A(C.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class U{static fromTimestamp(e){return new U(e)}static min(){return new U(new P(0,0))}static max(){return new U(new P(253402300799,999999999))}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}constructor(e){this.timestamp=e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class q{get length(){return this.len}isEqual(e){return 0===q.comparator(this,e)}child(e){let t=this.segments.slice(this.offset,this.limit());return e instanceof q?e.forEach(e=>{t.push(e)}):t.push(e),this.construct(t)}limit(){return this.offset+this.length}popFirst(e){return e=void 0===e?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return 0===this.length}isPrefixOf(e){if(e.length<this.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}forEach(e){for(let t=this.offset,n=this.limit();t<n;t++)e(this.segments[t])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,t){let n=Math.min(e.length,t.length);for(let r=0;r<n;r++){let n=e.get(r),i=t.get(r);if(n<i)return -1;if(n>i)return 1}return e.length<t.length?-1:e.length>t.length?1:0}constructor(e,t,n){void 0===t?t=0:t>e.length&&I(),void 0===n?n=e.length-t:n>e.length-t&&I(),this.segments=e,this.offset=t,this.len=n}}class B extends q{construct(e,t,n){return new B(e,t,n)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(){for(var e=arguments.length,t=Array(e),n=0;n<e;n++)t[n]=arguments[n];let r=[];for(let e of t){if(e.indexOf("//")>=0)throw new A(C.INVALID_ARGUMENT,"Invalid segment (".concat(e,"). Paths must not contain // in them."));r.push(...e.split("/").filter(e=>e.length>0))}return new B(r)}static emptyPath(){return new B([])}}let z=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class K extends q{construct(e,t,n){return new K(e,t,n)}static isValidIdentifier(e){return z.test(e)}canonicalString(){return this.toArray().map(e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),K.isValidIdentifier(e)||(e="`"+e+"`"),e)).join(".")}toString(){return this.canonicalString()}isKeyField(){return 1===this.length&&"__name__"===this.get(0)}static keyField(){return new K(["__name__"])}static fromServerFormat(e){let t=[],n="",r=0,i=()=>{if(0===n.length)throw new A(C.INVALID_ARGUMENT,"Invalid field path (".concat(e,"). Paths must not be empty, begin with '.', end with '.', or contain '..'"));t.push(n),n=""},s=!1;for(;r<e.length;){let t=e[r];if("\\"===t){if(r+1===e.length)throw new A(C.INVALID_ARGUMENT,"Path has trailing escape character: "+e);let t=e[r+1];if("\\"!==t&&"."!==t&&"`"!==t)throw new A(C.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);n+=t,r+=2}else"`"===t?s=!s:"."!==t||s?n+=t:i(),r++}if(i(),s)throw new A(C.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new K(t)}static emptyPath(){return new K([])}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Q{static fromPath(e){return new Q(B.fromString(e))}static fromName(e){return new Q(B.fromString(e).popFirst(5))}static empty(){return new Q(B.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return null!==e&&0===B.comparator(this.path,e.path)}toString(){return this.path.toString()}static comparator(e,t){return B.comparator(e.path,t.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new Q(new B(e.slice()))}constructor(e){this.path=e}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class G{constructor(e,t,n,r){this.indexId=e,this.collectionGroup=t,this.fields=n,this.indexState=r}}G.UNKNOWN_ID=-1;class j{static min(){return new j(U.min(),Q.empty(),-1)}static max(){return new j(U.max(),Q.empty(),-1)}constructor(e,t,n){this.readTime=e,this.documentKey=t,this.largestBatchId=n}}class W{addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach(e=>e())}constructor(){this.onCommittedListeners=[]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function H(e){if(e.code!==C.FAILED_PRECONDITION||"The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab."!==e.message)throw e;w("LocalStore","Unexpectedly lost primary lease")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Y{catch(e){return this.next(void 0,e)}next(e,t){return this.callbackAttached&&I(),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(t,this.error):this.wrapSuccess(e,this.result):new Y((n,r)=>{this.nextCallback=t=>{this.wrapSuccess(e,t).next(n,r)},this.catchCallback=e=>{this.wrapFailure(t,e).next(n,r)}})}toPromise(){return new Promise((e,t)=>{this.next(e,t)})}wrapUserFunction(e){try{let t=e();return t instanceof Y?t:Y.resolve(t)}catch(e){return Y.reject(e)}}wrapSuccess(e,t){return e?this.wrapUserFunction(()=>e(t)):Y.resolve(t)}wrapFailure(e,t){return e?this.wrapUserFunction(()=>e(t)):Y.reject(t)}static resolve(e){return new Y((t,n)=>{t(e)})}static reject(e){return new Y((t,n)=>{n(e)})}static waitFor(e){return new Y((t,n)=>{let r=0,i=0,s=!1;e.forEach(e=>{++r,e.next(()=>{++i,s&&i===r&&t()},e=>n(e))}),s=!0,i===r&&t()})}static or(e){let t=Y.resolve(!1);for(let n of e)t=t.next(e=>e?Y.resolve(e):n());return t}static forEach(e,t){let n=[];return e.forEach((e,r)=>{n.push(t.call(this,e,r))}),this.waitFor(n)}static mapArray(e,t){return new Y((n,r)=>{let i=e.length,s=Array(i),a=0;for(let o=0;o<i;o++){let l=o;t(e[l]).next(e=>{s[l]=e,++a===i&&n(s)},e=>r(e))}})}static doWhile(e,t){return new Y((n,r)=>{let i=()=>{!0===e()?t().next(()=>{i()},r):n()};i()})}constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e(e=>{this.isDone=!0,this.result=e,this.nextCallback&&this.nextCallback(e)},e=>{this.isDone=!0,this.error=e,this.catchCallback&&this.catchCallback(e)})}}function X(e){return"IndexedDbTransactionError"===e.name}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class J{ie(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){let e=++this.previousValue;return this.se&&this.se(e),e}constructor(e,t){this.previousValue=e,t&&(t.sequenceNumberHandler=e=>this.ie(e),this.se=e=>t.writeSequenceNumber(e))}}function Z(e){return 0===e&&1/e==-1/0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function $(e){let t=0;for(let n in e)Object.prototype.hasOwnProperty.call(e,n)&&t++;return t}function ee(e,t){for(let n in e)Object.prototype.hasOwnProperty.call(e,n)&&t(n,e[n])}function et(e){for(let t in e)if(Object.prototype.hasOwnProperty.call(e,t))return!1;return!0}J.oe=-1;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class en{insert(e,t){return new en(this.comparator,this.root.insert(e,t,this.comparator).copy(null,null,ei.BLACK,null,null))}remove(e){return new en(this.comparator,this.root.remove(e,this.comparator).copy(null,null,ei.BLACK,null,null))}get(e){let t=this.root;for(;!t.isEmpty();){let n=this.comparator(e,t.key);if(0===n)return t.value;n<0?t=t.left:n>0&&(t=t.right)}return null}indexOf(e){let t=0,n=this.root;for(;!n.isEmpty();){let r=this.comparator(e,n.key);if(0===r)return t+n.left.size;r<0?n=n.left:(t+=n.left.size+1,n=n.right)}return -1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal((t,n)=>(e(t,n),!1))}toString(){let e=[];return this.inorderTraversal((t,n)=>(e.push("".concat(t,":").concat(n)),!1)),"{".concat(e.join(", "),"}")}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new er(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new er(this.root,e,this.comparator,!1)}getReverseIterator(){return new er(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new er(this.root,e,this.comparator,!0)}constructor(e,t){this.comparator=e,this.root=t||ei.EMPTY}}class er{getNext(){let e=this.nodeStack.pop(),t={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return t}hasNext(){return this.nodeStack.length>0}peek(){if(0===this.nodeStack.length)return null;let e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}constructor(e,t,n,r){this.isReverse=r,this.nodeStack=[];let i=1;for(;!e.isEmpty();)if(i=t?n(e.key,t):1,t&&r&&(i*=-1),i<0)e=this.isReverse?e.left:e.right;else{if(0===i){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}}class ei{copy(e,t,n,r,i){return new ei(null!=e?e:this.key,null!=t?t:this.value,null!=n?n:this.color,null!=r?r:this.left,null!=i?i:this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,t,n){let r=this,i=n(e,r.key);return(r=i<0?r.copy(null,null,null,r.left.insert(e,t,n),null):0===i?r.copy(null,t,null,null,null):r.copy(null,null,null,null,r.right.insert(e,t,n))).fixUp()}removeMin(){if(this.left.isEmpty())return ei.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),(e=e.copy(null,null,null,e.left.removeMin(),null)).fixUp()}remove(e,t){let n,r=this;if(0>t(e,r.key))r.left.isEmpty()||r.left.isRed()||r.left.left.isRed()||(r=r.moveRedLeft()),r=r.copy(null,null,null,r.left.remove(e,t),null);else{if(r.left.isRed()&&(r=r.rotateRight()),r.right.isEmpty()||r.right.isRed()||r.right.left.isRed()||(r=r.moveRedRight()),0===t(e,r.key)){if(r.right.isEmpty())return ei.EMPTY;n=r.right.min(),r=r.copy(n.key,n.value,null,null,r.right.removeMin())}r=r.copy(null,null,null,null,r.right.remove(e,t))}return r.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=(e=(e=e.copy(null,null,null,null,e.right.rotateRight())).rotateLeft()).colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=(e=e.rotateRight()).colorFlip()),e}rotateLeft(){let e=this.copy(null,null,ei.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){let e=this.copy(null,null,ei.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){let e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t)}checkMaxDepth(){return Math.pow(2,this.check())<=this.size+1}check(){if(this.isRed()&&this.left.isRed()||this.right.isRed())throw I();let e=this.left.check();if(e!==this.right.check())throw I();return e+(this.isRed()?0:1)}constructor(e,t,n,r,i){this.key=e,this.value=t,this.color=null!=n?n:ei.RED,this.left=null!=r?r:ei.EMPTY,this.right=null!=i?i:ei.EMPTY,this.size=this.left.size+1+this.right.size}}ei.EMPTY=null,ei.RED=!0,ei.BLACK=!1,ei.EMPTY=new class{get key(){throw I()}get value(){throw I()}get color(){throw I()}get left(){throw I()}get right(){throw I()}copy(e,t,n,r,i){return this}insert(e,t,n){return new ei(e,t)}remove(e,t){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}constructor(){this.size=0}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class es{has(e){return null!==this.data.get(e)}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal((t,n)=>(e(t),!1))}forEachInRange(e,t){let n=this.data.getIteratorFrom(e[0]);for(;n.hasNext();){let r=n.getNext();if(this.comparator(r.key,e[1])>=0)return;t(r.key)}}forEachWhile(e,t){let n;for(n=void 0!==t?this.data.getIteratorFrom(t):this.data.getIterator();n.hasNext();)if(!e(n.getNext().key))return}firstAfterOrEqual(e){let t=this.data.getIteratorFrom(e);return t.hasNext()?t.getNext().key:null}getIterator(){return new ea(this.data.getIterator())}getIteratorFrom(e){return new ea(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let t=this;return t.size<e.size&&(t=e,e=this),e.forEach(e=>{t=t.add(e)}),t}isEqual(e){if(!(e instanceof es)||this.size!==e.size)return!1;let t=this.data.getIterator(),n=e.data.getIterator();for(;t.hasNext();){let e=t.getNext().key,r=n.getNext().key;if(0!==this.comparator(e,r))return!1}return!0}toArray(){let e=[];return this.forEach(t=>{e.push(t)}),e}toString(){let e=[];return this.forEach(t=>e.push(t)),"SortedSet("+e.toString()+")"}copy(e){let t=new es(this.comparator);return t.data=e,t}constructor(e){this.comparator=e,this.data=new en(this.comparator)}}class ea{getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}constructor(e){this.iter=e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eo{static empty(){return new eo([])}unionWith(e){let t=new es(K.comparator);for(let e of this.fields)t=t.add(e);for(let n of e)t=t.add(n);return new eo(t.toArray())}covers(e){for(let t of this.fields)if(t.isPrefixOf(e))return!0;return!1}isEqual(e){return F(this.fields,e.fields,(e,t)=>e.isEqual(t))}constructor(e){this.fields=e,e.sort(K.comparator)}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class el extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eu{static fromBase64String(e){return new eu(function(e){try{return atob(e)}catch(e){throw"undefined"!=typeof DOMException&&e instanceof DOMException?new el("Invalid base64 string: "+e):e}}(e))}static fromUint8Array(e){return new eu(function(e){let t="";for(let n=0;n<e.length;++n)t+=String.fromCharCode(e[n]);return t}(e))}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return btoa(this.binaryString)}toUint8Array(){return function(e){let t=new Uint8Array(e.length);for(let n=0;n<e.length;n++)t[n]=e.charCodeAt(n);return t}(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return O(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}constructor(e){this.binaryString=e}}eu.EMPTY_BYTE_STRING=new eu("");let ec=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function eh(e){if(e||I(),"string"==typeof e){let t=0,n=ec.exec(e);if(n||I(),n[1]){let e=n[1];t=Number(e=(e+"000000000").substr(0,9))}return{seconds:Math.floor(new Date(e).getTime()/1e3),nanos:t}}return{seconds:ed(e.seconds),nanos:ed(e.nanos)}}function ed(e){return"number"==typeof e?e:"string"==typeof e?Number(e):0}function ef(e){return"string"==typeof e?eu.fromBase64String(e):eu.fromUint8Array(e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function em(e){var t,n;return"server_timestamp"===(null===(n=((null===(t=null==e?void 0:e.mapValue)||void 0===t?void 0:t.fields)||{}).__type__)||void 0===n?void 0:n.stringValue)}function eg(e){let t=e.mapValue.fields.__previous_value__;return em(t)?eg(t):t}function ep(e){let t=eh(e.mapValue.fields.__local_write_time__.timestampValue);return new P(t.seconds,t.nanos)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ey{constructor(e,t,n,r,i,s,a,o,l){this.databaseId=e,this.appId=t,this.persistenceKey=n,this.host=r,this.ssl=i,this.forceLongPolling=s,this.autoDetectLongPolling=a,this.longPollingOptions=o,this.useFetchStreams=l}}class ev{static empty(){return new ev("","")}get isDefaultDatabase(){return"(default)"===this.database}isEqual(e){return e instanceof ev&&e.projectId===this.projectId&&e.database===this.database}constructor(e,t){this.projectId=e,this.database=t||"(default)"}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let ew={mapValue:{fields:{__type__:{stringValue:"__max__"}}}};function e_(e){return"nullValue"in e?0:"booleanValue"in e?1:"integerValue"in e||"doubleValue"in e?2:"timestampValue"in e?3:"stringValue"in e?5:"bytesValue"in e?6:"referenceValue"in e?7:"geoPointValue"in e?8:"arrayValue"in e?9:"mapValue"in e?em(e)?4:eM(e)?9007199254740991:eL(e)?10:11:I()}function eE(e,t){if(e===t)return!0;let n=e_(e);if(n!==e_(t))return!1;switch(n){case 0:case 9007199254740991:return!0;case 1:return e.booleanValue===t.booleanValue;case 4:return ep(e).isEqual(ep(t));case 3:return function(e,t){if("string"==typeof e.timestampValue&&"string"==typeof t.timestampValue&&e.timestampValue.length===t.timestampValue.length)return e.timestampValue===t.timestampValue;let n=eh(e.timestampValue),r=eh(t.timestampValue);return n.seconds===r.seconds&&n.nanos===r.nanos}(e,t);case 5:return e.stringValue===t.stringValue;case 6:return ef(e.bytesValue).isEqual(ef(t.bytesValue));case 7:return e.referenceValue===t.referenceValue;case 8:return ed(e.geoPointValue.latitude)===ed(t.geoPointValue.latitude)&&ed(e.geoPointValue.longitude)===ed(t.geoPointValue.longitude);case 2:return function(e,t){if("integerValue"in e&&"integerValue"in t)return ed(e.integerValue)===ed(t.integerValue);if("doubleValue"in e&&"doubleValue"in t){let n=ed(e.doubleValue),r=ed(t.doubleValue);return n===r?Z(n)===Z(r):isNaN(n)&&isNaN(r)}return!1}(e,t);case 9:return F(e.arrayValue.values||[],t.arrayValue.values||[],eE);case 10:case 11:return function(e,t){let n=e.mapValue.fields||{},r=t.mapValue.fields||{};if($(n)!==$(r))return!1;for(let e in n)if(n.hasOwnProperty(e)&&(void 0===r[e]||!eE(n[e],r[e])))return!1;return!0}(e,t);default:return I()}}function eT(e,t){return void 0!==(e.values||[]).find(e=>eE(e,t))}function eI(e,t){if(e===t)return 0;let n=e_(e),r=e_(t);if(n!==r)return O(n,r);switch(n){case 0:case 9007199254740991:return 0;case 1:return O(e.booleanValue,t.booleanValue);case 2:return function(e,t){let n=ed(e.integerValue||e.doubleValue),r=ed(t.integerValue||t.doubleValue);return n<r?-1:n>r?1:n===r?0:isNaN(n)?isNaN(r)?0:-1:1}(e,t);case 3:return eC(e.timestampValue,t.timestampValue);case 4:return eC(ep(e),ep(t));case 5:return O(e.stringValue,t.stringValue);case 6:return function(e,t){let n=ef(e),r=ef(t);return n.compareTo(r)}(e.bytesValue,t.bytesValue);case 7:return function(e,t){let n=e.split("/"),r=t.split("/");for(let e=0;e<n.length&&e<r.length;e++){let t=O(n[e],r[e]);if(0!==t)return t}return O(n.length,r.length)}(e.referenceValue,t.referenceValue);case 8:return function(e,t){let n=O(ed(e.latitude),ed(t.latitude));return 0!==n?n:O(ed(e.longitude),ed(t.longitude))}(e.geoPointValue,t.geoPointValue);case 9:return eA(e.arrayValue,t.arrayValue);case 10:return function(e,t){var n,r,i,s;let a=e.fields||{},o=t.fields||{},l=null===(n=a.value)||void 0===n?void 0:n.arrayValue,u=null===(r=o.value)||void 0===r?void 0:r.arrayValue,c=O((null===(i=null==l?void 0:l.values)||void 0===i?void 0:i.length)||0,(null===(s=null==u?void 0:u.values)||void 0===s?void 0:s.length)||0);return 0!==c?c:eA(l,u)}(e.mapValue,t.mapValue);case 11:return function(e,t){if(e===ew.mapValue&&t===ew.mapValue)return 0;if(e===ew.mapValue)return 1;if(t===ew.mapValue)return -1;let n=e.fields||{},r=Object.keys(n),i=t.fields||{},s=Object.keys(i);r.sort(),s.sort();for(let e=0;e<r.length&&e<s.length;++e){let t=O(r[e],s[e]);if(0!==t)return t;let a=eI(n[r[e]],i[s[e]]);if(0!==a)return a}return O(r.length,s.length)}(e.mapValue,t.mapValue);default:throw I()}}function eC(e,t){if("string"==typeof e&&"string"==typeof t&&e.length===t.length)return O(e,t);let n=eh(e),r=eh(t),i=O(n.seconds,r.seconds);return 0!==i?i:O(n.nanos,r.nanos)}function eA(e,t){let n=e.values||[],r=t.values||[];for(let e=0;e<n.length&&e<r.length;++e){let t=eI(n[e],r[e]);if(t)return t}return O(n.length,r.length)}function eS(e){var t,n;return"nullValue"in e?"null":"booleanValue"in e?""+e.booleanValue:"integerValue"in e?""+e.integerValue:"doubleValue"in e?""+e.doubleValue:"timestampValue"in e?function(e){let t=eh(e);return"time(".concat(t.seconds,",").concat(t.nanos,")")}(e.timestampValue):"stringValue"in e?e.stringValue:"bytesValue"in e?ef(e.bytesValue).toBase64():"referenceValue"in e?(t=e.referenceValue,Q.fromName(t).toString()):"geoPointValue"in e?(n=e.geoPointValue,"geo(".concat(n.latitude,",").concat(n.longitude,")")):"arrayValue"in e?function(e){let t="[",n=!0;for(let r of e.values||[])n?n=!1:t+=",",t+=eS(r);return t+"]"}(e.arrayValue):"mapValue"in e?function(e){let t=Object.keys(e.fields||{}).sort(),n="{",r=!0;for(let i of t)r?r=!1:n+=",",n+="".concat(i,":").concat(eS(e.fields[i]));return n+"}"}(e.mapValue):I()}function eN(e,t){return{referenceValue:"projects/".concat(e.projectId,"/databases/").concat(e.database,"/documents/").concat(t.path.canonicalString())}}function ek(e){return!!e&&"integerValue"in e}function eb(e){return!!e&&"arrayValue"in e}function eD(e){return!!e&&"nullValue"in e}function eR(e){return!!e&&"doubleValue"in e&&isNaN(Number(e.doubleValue))}function ex(e){return!!e&&"mapValue"in e}function eL(e){var t,n;return"__vector__"===(null===(n=((null===(t=null==e?void 0:e.mapValue)||void 0===t?void 0:t.fields)||{}).__type__)||void 0===n?void 0:n.stringValue)}function eV(e){if(e.geoPointValue)return{geoPointValue:Object.assign({},e.geoPointValue)};if(e.timestampValue&&"object"==typeof e.timestampValue)return{timestampValue:Object.assign({},e.timestampValue)};if(e.mapValue){let t={mapValue:{fields:{}}};return ee(e.mapValue.fields,(e,n)=>t.mapValue.fields[e]=eV(n)),t}if(e.arrayValue){let t={arrayValue:{values:[]}};for(let n=0;n<(e.arrayValue.values||[]).length;++n)t.arrayValue.values[n]=eV(e.arrayValue.values[n]);return t}return Object.assign({},e)}function eM(e){return"__max__"===(((e.mapValue||{}).fields||{}).__type__||{}).stringValue}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eO{static empty(){return new eO({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let t=this.value;for(let n=0;n<e.length-1;++n)if(!ex(t=(t.mapValue.fields||{})[e.get(n)]))return null;return(t=(t.mapValue.fields||{})[e.lastSegment()])||null}}set(e,t){this.getFieldsMap(e.popLast())[e.lastSegment()]=eV(t)}setAll(e){let t=K.emptyPath(),n={},r=[];e.forEach((e,i)=>{if(!t.isImmediateParentOf(i)){let e=this.getFieldsMap(t);this.applyChanges(e,n,r),n={},r=[],t=i.popLast()}e?n[i.lastSegment()]=eV(e):r.push(i.lastSegment())});let i=this.getFieldsMap(t);this.applyChanges(i,n,r)}delete(e){let t=this.field(e.popLast());ex(t)&&t.mapValue.fields&&delete t.mapValue.fields[e.lastSegment()]}isEqual(e){return eE(this.value,e.value)}getFieldsMap(e){let t=this.value;t.mapValue.fields||(t.mapValue={fields:{}});for(let n=0;n<e.length;++n){let r=t.mapValue.fields[e.get(n)];ex(r)&&r.mapValue.fields||(r={mapValue:{fields:{}}},t.mapValue.fields[e.get(n)]=r),t=r}return t.mapValue.fields}applyChanges(e,t,n){for(let r of(ee(t,(t,n)=>e[t]=n),n))delete e[r]}clone(){return new eO(eV(this.value))}constructor(e){this.value=e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eF{static newInvalidDocument(e){return new eF(e,0,U.min(),U.min(),U.min(),eO.empty(),0)}static newFoundDocument(e,t,n,r){return new eF(e,1,t,U.min(),n,r,0)}static newNoDocument(e,t){return new eF(e,2,t,U.min(),U.min(),eO.empty(),0)}static newUnknownDocument(e,t){return new eF(e,3,t,U.min(),U.min(),eO.empty(),2)}convertToFoundDocument(e,t){return this.createTime.isEqual(U.min())&&(2===this.documentType||0===this.documentType)&&(this.createTime=e),this.version=e,this.documentType=1,this.data=t,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=eO.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=eO.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=U.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return 1===this.documentState}get hasCommittedMutations(){return 2===this.documentState}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return 0!==this.documentType}isFoundDocument(){return 1===this.documentType}isNoDocument(){return 2===this.documentType}isUnknownDocument(){return 3===this.documentType}isEqual(e){return e instanceof eF&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new eF(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return"Document(".concat(this.key,", ").concat(this.version,", ").concat(JSON.stringify(this.data.value),", {createTime: ").concat(this.createTime,"}), {documentType: ").concat(this.documentType,"}), {documentState: ").concat(this.documentState,"})")}constructor(e,t,n,r,i,s,a){this.key=e,this.documentType=t,this.version=n,this.readTime=r,this.createTime=i,this.data=s,this.documentState=a}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eP{constructor(e,t){this.position=e,this.inclusive=t}}function eU(e,t,n){let r=0;for(let i=0;i<e.position.length;i++){let s=t[i],a=e.position[i];if(r=s.field.isKeyField()?Q.comparator(Q.fromName(a.referenceValue),n.key):eI(a,n.data.field(s.field)),"desc"===s.dir&&(r*=-1),0!==r)break}return r}function eq(e,t){if(null===e)return null===t;if(null===t||e.inclusive!==t.inclusive||e.position.length!==t.position.length)return!1;for(let n=0;n<e.position.length;n++)if(!eE(e.position[n],t.position[n]))return!1;return!0}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eB{constructor(e,t="asc"){this.field=e,this.dir=t}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ez{}class eK extends ez{static create(e,t,n){return e.isKeyField()?"in"===t||"not-in"===t?this.createKeyFieldInFilter(e,t,n):new eW(e,t,n):"array-contains"===t?new eJ(e,n):"in"===t?new eZ(e,n):"not-in"===t?new e$(e,n):"array-contains-any"===t?new e0(e,n):new eK(e,t,n)}static createKeyFieldInFilter(e,t,n){return"in"===t?new eH(e,n):new eY(e,n)}matches(e){let t=e.data.field(this.field);return"!="===this.op?null!==t&&this.matchesComparison(eI(t,this.value)):null!==t&&e_(this.value)===e_(t)&&this.matchesComparison(eI(t,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return 0===e;case"!=":return 0!==e;case">":return e>0;case">=":return e>=0;default:return I()}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}constructor(e,t,n){super(),this.field=e,this.op=t,this.value=n}}class eQ extends ez{static create(e,t){return new eQ(e,t)}matches(e){return eG(this)?void 0===this.filters.find(t=>!t.matches(e)):void 0!==this.filters.find(t=>t.matches(e))}getFlattenedFilters(){return null!==this.ae||(this.ae=this.filters.reduce((e,t)=>e.concat(t.getFlattenedFilters()),[])),this.ae}getFilters(){return Object.assign([],this.filters)}constructor(e,t){super(),this.filters=e,this.op=t,this.ae=null}}function eG(e){return"and"===e.op}function ej(e){for(let t of e.filters)if(t instanceof eQ)return!1;return!0}class eW extends eK{matches(e){let t=Q.comparator(e.key,this.key);return this.matchesComparison(t)}constructor(e,t,n){super(e,t,n),this.key=Q.fromName(n.referenceValue)}}class eH extends eK{matches(e){return this.keys.some(t=>t.isEqual(e.key))}constructor(e,t){super(e,"in",t),this.keys=eX("in",t)}}class eY extends eK{matches(e){return!this.keys.some(t=>t.isEqual(e.key))}constructor(e,t){super(e,"not-in",t),this.keys=eX("not-in",t)}}function eX(e,t){var n;return((null===(n=t.arrayValue)||void 0===n?void 0:n.values)||[]).map(e=>Q.fromName(e.referenceValue))}class eJ extends eK{matches(e){let t=e.data.field(this.field);return eb(t)&&eT(t.arrayValue,this.value)}constructor(e,t){super(e,"array-contains",t)}}class eZ extends eK{matches(e){let t=e.data.field(this.field);return null!==t&&eT(this.value.arrayValue,t)}constructor(e,t){super(e,"in",t)}}class e$ extends eK{matches(e){if(eT(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;let t=e.data.field(this.field);return null!==t&&!eT(this.value.arrayValue,t)}constructor(e,t){super(e,"not-in",t)}}class e0 extends eK{matches(e){let t=e.data.field(this.field);return!(!eb(t)||!t.arrayValue.values)&&t.arrayValue.values.some(e=>eT(this.value.arrayValue,e))}constructor(e,t){super(e,"array-contains-any",t)}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class e1{constructor(e,t=null,n=[],r=[],i=null,s=null,a=null){this.path=e,this.collectionGroup=t,this.orderBy=n,this.filters=r,this.limit=i,this.startAt=s,this.endAt=a,this.ue=null}}function e2(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:null,n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:[],r=arguments.length>3&&void 0!==arguments[3]?arguments[3]:[],i=arguments.length>4&&void 0!==arguments[4]?arguments[4]:null,s=arguments.length>5&&void 0!==arguments[5]?arguments[5]:null,a=arguments.length>6&&void 0!==arguments[6]?arguments[6]:null;return new e1(e,t,n,r,i,s,a)}function e3(e){if(null===e.ue){let t=e.path.canonicalString();null!==e.collectionGroup&&(t+="|cg:"+e.collectionGroup),t+="|f:"+e.filters.map(e=>(function e(t){if(t instanceof eK)return t.field.canonicalString()+t.op.toString()+eS(t.value);if(ej(t)&&eG(t))return t.filters.map(t=>e(t)).join(",");{let n=t.filters.map(t=>e(t)).join(",");return"".concat(t.op,"(").concat(n,")")}})(e)).join(",")+"|ob:"+e.orderBy.map(e=>e.field.canonicalString()+e.dir).join(","),null==e.limit||(t+="|l:"+e.limit),e.startAt&&(t+="|lb:"+(e.startAt.inclusive?"b:":"a:")+e.startAt.position.map(e=>eS(e)).join(",")),e.endAt&&(t+="|ub:"+(e.endAt.inclusive?"a:":"b:")+e.endAt.position.map(e=>eS(e)).join(",")),e.ue=t}return e.ue}function e4(e,t){if(e.limit!==t.limit||e.orderBy.length!==t.orderBy.length)return!1;for(let i=0;i<e.orderBy.length;i++){var n,r;if(n=e.orderBy[i],r=t.orderBy[i],!(n.dir===r.dir&&n.field.isEqual(r.field)))return!1}if(e.filters.length!==t.filters.length)return!1;for(let n=0;n<e.filters.length;n++)if(!function e(t,n){return t instanceof eK?n instanceof eK&&t.op===n.op&&t.field.isEqual(n.field)&&eE(t.value,n.value):t instanceof eQ?n instanceof eQ&&t.op===n.op&&t.filters.length===n.filters.length&&t.filters.reduce((t,r,i)=>t&&e(r,n.filters[i]),!0):void I()}(e.filters[n],t.filters[n]))return!1;return e.collectionGroup===t.collectionGroup&&!!e.path.isEqual(t.path)&&!!eq(e.startAt,t.startAt)&&eq(e.endAt,t.endAt)}function e9(e){return Q.isDocumentKey(e.path)&&null===e.collectionGroup&&0===e.filters.length}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class e8{constructor(e,t=null,n=[],r=[],i=null,s="F",a=null,o=null){this.path=e,this.collectionGroup=t,this.explicitOrderBy=n,this.filters=r,this.limit=i,this.limitType=s,this.startAt=a,this.endAt=o,this.ce=null,this.le=null,this.he=null,this.startAt,this.endAt}}function e5(e){return 0===e.filters.length&&null===e.limit&&null==e.startAt&&null==e.endAt&&(0===e.explicitOrderBy.length||1===e.explicitOrderBy.length&&e.explicitOrderBy[0].field.isKeyField())}function e6(e){return null!==e.collectionGroup}function e7(e){if(null===e.ce){let t;e.ce=[];let n=new Set;for(let t of e.explicitOrderBy)e.ce.push(t),n.add(t.field.canonicalString());let r=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(t=new es(K.comparator),e.filters.forEach(e=>{e.getFlattenedFilters().forEach(e=>{e.isInequality()&&(t=t.add(e.field))})}),t).forEach(t=>{n.has(t.canonicalString())||t.isKeyField()||e.ce.push(new eB(t,r))}),n.has(K.keyField().canonicalString())||e.ce.push(new eB(K.keyField(),r))}return e.ce}function te(e){return e.le||(e.le=function(e,t){if("F"===e.limitType)return e2(e.path,e.collectionGroup,t,e.filters,e.limit,e.startAt,e.endAt);{t=t.map(e=>{let t="desc"===e.dir?"asc":"desc";return new eB(e.field,t)});let n=e.endAt?new eP(e.endAt.position,e.endAt.inclusive):null,r=e.startAt?new eP(e.startAt.position,e.startAt.inclusive):null;return e2(e.path,e.collectionGroup,t,e.filters,e.limit,n,r)}}(e,e7(e))),e.le}function tt(e,t){let n=e.filters.concat([t]);return new e8(e.path,e.collectionGroup,e.explicitOrderBy.slice(),n,e.limit,e.limitType,e.startAt,e.endAt)}function tn(e,t,n){return new e8(e.path,e.collectionGroup,e.explicitOrderBy.slice(),e.filters.slice(),t,n,e.startAt,e.endAt)}function tr(e,t){return e4(te(e),te(t))&&e.limitType===t.limitType}function ti(e){return"".concat(e3(te(e)),"|lt:").concat(e.limitType)}function ts(e){var t;let n;return"Query(target=".concat((n=(t=te(e)).path.canonicalString(),null!==t.collectionGroup&&(n+=" collectionGroup="+t.collectionGroup),t.filters.length>0&&(n+=", filters: [".concat(t.filters.map(e=>(function e(t){return t instanceof eK?"".concat(t.field.canonicalString()," ").concat(t.op," ").concat(eS(t.value)):t instanceof eQ?t.op.toString()+" {"+t.getFilters().map(e).join(" ,")+"}":"Filter"})(e)).join(", "),"]")),null==t.limit||(n+=", limit: "+t.limit),t.orderBy.length>0&&(n+=", orderBy: [".concat(t.orderBy.map(e=>"".concat(e.field.canonicalString()," (").concat(e.dir,")")).join(", "),"]")),t.startAt&&(n+=", startAt: "+(t.startAt.inclusive?"b:":"a:")+t.startAt.position.map(e=>eS(e)).join(",")),t.endAt&&(n+=", endAt: "+(t.endAt.inclusive?"a:":"b:")+t.endAt.position.map(e=>eS(e)).join(",")),"Target(".concat(n,")")),"; limitType=").concat(e.limitType,")")}function ta(e,t){return t.isFoundDocument()&&function(e,t){let n=t.key.path;return null!==e.collectionGroup?t.key.hasCollectionId(e.collectionGroup)&&e.path.isPrefixOf(n):Q.isDocumentKey(e.path)?e.path.isEqual(n):e.path.isImmediateParentOf(n)}(e,t)&&function(e,t){for(let n of e7(e))if(!n.field.isKeyField()&&null===t.data.field(n.field))return!1;return!0}(e,t)&&function(e,t){for(let n of e.filters)if(!n.matches(t))return!1;return!0}(e,t)&&(!e.startAt||!!function(e,t,n){let r=eU(e,t,n);return e.inclusive?r<=0:r<0}(e.startAt,e7(e),t))&&(!e.endAt||!!function(e,t,n){let r=eU(e,t,n);return e.inclusive?r>=0:r>0}(e.endAt,e7(e),t))}function to(e){return(t,n)=>{let r=!1;for(let i of e7(e)){let e=function(e,t,n){let r=e.field.isKeyField()?Q.comparator(t.key,n.key):function(e,t,n){let r=t.data.field(e),i=n.data.field(e);return null!==r&&null!==i?eI(r,i):I()}(e.field,t,n);switch(e.dir){case"asc":return r;case"desc":return -1*r;default:return I()}}(i,t,n);if(0!==e)return e;r=r||i.field.isKeyField()}return 0}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tl{get(e){let t=this.mapKeyFn(e),n=this.inner[t];if(void 0!==n){for(let[t,r]of n)if(this.equalsFn(t,e))return r}}has(e){return void 0!==this.get(e)}set(e,t){let n=this.mapKeyFn(e),r=this.inner[n];if(void 0===r)return this.inner[n]=[[e,t]],void this.innerSize++;for(let n=0;n<r.length;n++)if(this.equalsFn(r[n][0],e))return void(r[n]=[e,t]);r.push([e,t]),this.innerSize++}delete(e){let t=this.mapKeyFn(e),n=this.inner[t];if(void 0===n)return!1;for(let r=0;r<n.length;r++)if(this.equalsFn(n[r][0],e))return 1===n.length?delete this.inner[t]:n.splice(r,1),this.innerSize--,!0;return!1}forEach(e){ee(this.inner,(t,n)=>{for(let[t,r]of n)e(t,r)})}isEmpty(){return et(this.inner)}size(){return this.innerSize}constructor(e,t){this.mapKeyFn=e,this.equalsFn=t,this.inner={},this.innerSize=0}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let tu=new en(Q.comparator),tc=new en(Q.comparator);function th(){for(var e=arguments.length,t=Array(e),n=0;n<e;n++)t[n]=arguments[n];let r=tc;for(let e of t)r=r.insert(e.key,e);return r}function td(e){let t=tc;return e.forEach((e,n)=>t=t.insert(e,n.overlayedDocument)),t}function tf(){return new tl(e=>e.toString(),(e,t)=>e.isEqual(t))}let tm=new en(Q.comparator),tg=new es(Q.comparator);function tp(){for(var e=arguments.length,t=Array(e),n=0;n<e;n++)t[n]=arguments[n];let r=tg;for(let e of t)r=r.add(e);return r}let ty=new es(O);/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function tv(e,t){if(e.useProto3Json){if(isNaN(t))return{doubleValue:"NaN"};if(t===1/0)return{doubleValue:"Infinity"};if(t===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:Z(t)?"-0":t}}function tw(e){return{integerValue:""+e}}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class t_{constructor(){this._=void 0}}function tE(e,t){return e instanceof tN?ek(t)||t&&"doubleValue"in t?t:{integerValue:0}:null}class tT extends t_{}class tI extends t_{constructor(e){super(),this.elements=e}}function tC(e,t){let n=tb(t);for(let t of e.elements)n.some(e=>eE(e,t))||n.push(t);return{arrayValue:{values:n}}}class tA extends t_{constructor(e){super(),this.elements=e}}function tS(e,t){let n=tb(t);for(let t of e.elements)n=n.filter(e=>!eE(e,t));return{arrayValue:{values:n}}}class tN extends t_{constructor(e,t){super(),this.serializer=e,this.Pe=t}}function tk(e){return ed(e.integerValue||e.doubleValue)}function tb(e){return eb(e)&&e.arrayValue.values?e.arrayValue.values.slice():[]}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tD{constructor(e,t){this.field=e,this.transform=t}}class tR{constructor(e,t){this.version=e,this.transformResults=t}}class tx{static none(){return new tx}static exists(e){return new tx(void 0,e)}static updateTime(e){return new tx(e)}get isNone(){return void 0===this.updateTime&&void 0===this.exists}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}constructor(e,t){this.updateTime=e,this.exists=t}}function tL(e,t){return void 0!==e.updateTime?t.isFoundDocument()&&t.version.isEqual(e.updateTime):void 0===e.exists||e.exists===t.isFoundDocument()}class tV{}function tM(e,t){if(!e.hasLocalMutations||t&&0===t.fields.length)return null;if(null===t)return e.isNoDocument()?new tK(e.key,tx.none()):new tP(e.key,e.data,tx.none());{let n=e.data,r=eO.empty(),i=new es(K.comparator);for(let e of t.fields)if(!i.has(e)){let t=n.field(e);null===t&&e.length>1&&(e=e.popLast(),t=n.field(e)),null===t?r.delete(e):r.set(e,t),i=i.add(e)}return new tU(e.key,r,new eo(i.toArray()),tx.none())}}function tO(e,t,n,r){return e instanceof tP?function(e,t,n,r){if(!tL(e.precondition,t))return n;let i=e.value.clone(),s=tz(e.fieldTransforms,r,t);return i.setAll(s),t.convertToFoundDocument(t.version,i).setHasLocalMutations(),null}(e,t,n,r):e instanceof tU?function(e,t,n,r){if(!tL(e.precondition,t))return n;let i=tz(e.fieldTransforms,r,t),s=t.data;return(s.setAll(tq(e)),s.setAll(i),t.convertToFoundDocument(t.version,s).setHasLocalMutations(),null===n)?null:n.unionWith(e.fieldMask.fields).unionWith(e.fieldTransforms.map(e=>e.field))}(e,t,n,r):tL(e.precondition,t)?(t.convertToNoDocument(t.version).setHasLocalMutations(),null):n}function tF(e,t){var n,r;return e.type===t.type&&!!e.key.isEqual(t.key)&&!!e.precondition.isEqual(t.precondition)&&(n=e.fieldTransforms,r=t.fieldTransforms,!!(void 0===n&&void 0===r||!(!n||!r)&&F(n,r,(e,t)=>{var n,r;return e.field.isEqual(t.field)&&(n=e.transform,r=t.transform,n instanceof tI&&r instanceof tI||n instanceof tA&&r instanceof tA?F(n.elements,r.elements,eE):n instanceof tN&&r instanceof tN?eE(n.Pe,r.Pe):n instanceof tT&&r instanceof tT)})))&&(0===e.type?e.value.isEqual(t.value):1!==e.type||e.data.isEqual(t.data)&&e.fieldMask.isEqual(t.fieldMask))}class tP extends tV{getFieldMask(){return null}constructor(e,t,n,r=[]){super(),this.key=e,this.value=t,this.precondition=n,this.fieldTransforms=r,this.type=0}}class tU extends tV{getFieldMask(){return this.fieldMask}constructor(e,t,n,r,i=[]){super(),this.key=e,this.data=t,this.fieldMask=n,this.precondition=r,this.fieldTransforms=i,this.type=1}}function tq(e){let t=new Map;return e.fieldMask.fields.forEach(n=>{if(!n.isEmpty()){let r=e.data.field(n);t.set(n,r)}}),t}function tB(e,t,n){var r;let i=new Map;e.length===n.length||I();for(let s=0;s<n.length;s++){let a=e[s],o=a.transform,l=t.data.field(a.field);i.set(a.field,(r=n[s],o instanceof tI?tC(o,l):o instanceof tA?tS(o,l):r))}return i}function tz(e,t,n){let r=new Map;for(let i of e){let e=i.transform,s=n.data.field(i.field);r.set(i.field,e instanceof tT?function(e,t){let n={fields:{__type__:{stringValue:"server_timestamp"},__local_write_time__:{timestampValue:{seconds:e.seconds,nanos:e.nanoseconds}}}};return t&&em(t)&&(t=eg(t)),t&&(n.fields.__previous_value__=t),{mapValue:n}}(t,s):e instanceof tI?tC(e,s):e instanceof tA?tS(e,s):function(e,t){let n=tE(e,t),r=tk(n)+tk(e.Pe);return ek(n)&&ek(e.Pe)?tw(r):tv(e.serializer,r)}(e,s))}return r}class tK extends tV{getFieldMask(){return null}constructor(e,t){super(),this.key=e,this.precondition=t,this.type=2,this.fieldTransforms=[]}}class tQ extends tV{getFieldMask(){return null}constructor(e,t){super(),this.key=e,this.precondition=t,this.type=3,this.fieldTransforms=[]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tG{applyToRemoteDocument(e,t){let n=t.mutationResults;for(let t=0;t<this.mutations.length;t++){let i=this.mutations[t];if(i.key.isEqual(e.key)){var r;r=n[t],i instanceof tP?function(e,t,n){let r=e.value.clone(),i=tB(e.fieldTransforms,t,n.transformResults);r.setAll(i),t.convertToFoundDocument(n.version,r).setHasCommittedMutations()}(i,e,r):i instanceof tU?function(e,t,n){if(!tL(e.precondition,t))return void t.convertToUnknownDocument(n.version);let r=tB(e.fieldTransforms,t,n.transformResults),i=t.data;i.setAll(tq(e)),i.setAll(r),t.convertToFoundDocument(n.version,i).setHasCommittedMutations()}(i,e,r):function(e,t,n){t.convertToNoDocument(n.version).setHasCommittedMutations()}(0,e,r)}}}applyToLocalView(e,t){for(let n of this.baseMutations)n.key.isEqual(e.key)&&(t=tO(n,e,t,this.localWriteTime));for(let n of this.mutations)n.key.isEqual(e.key)&&(t=tO(n,e,t,this.localWriteTime));return t}applyToLocalDocumentSet(e,t){let n=tf();return this.mutations.forEach(r=>{let i=e.get(r.key),s=i.overlayedDocument,a=this.applyToLocalView(s,i.mutatedFields),o=tM(s,a=t.has(r.key)?null:a);null!==o&&n.set(r.key,o),s.isValidDocument()||s.convertToNoDocument(U.min())}),n}keys(){return this.mutations.reduce((e,t)=>e.add(t.key),tp())}isEqual(e){return this.batchId===e.batchId&&F(this.mutations,e.mutations,(e,t)=>tF(e,t))&&F(this.baseMutations,e.baseMutations,(e,t)=>tF(e,t))}constructor(e,t,n,r){this.batchId=e,this.localWriteTime=t,this.baseMutations=n,this.mutations=r}}class tj{static from(e,t,n){e.mutations.length===n.length||I();let r=tm,i=e.mutations;for(let e=0;e<i.length;e++)r=r.insert(i[e].key,n[e].version);return new tj(e,t,n,r)}constructor(e,t,n,r){this.batch=e,this.commitVersion=t,this.mutationResults=n,this.docVersions=r}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tW{getKey(){return this.mutation.key}isEqual(e){return null!==e&&this.mutation===e.mutation}toString(){return"Overlay{\n      largestBatchId: ".concat(this.largestBatchId,",\n      mutation: ").concat(this.mutation.toString(),"\n    }")}constructor(e,t){this.largestBatchId=e,this.mutation=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tH{constructor(e,t){this.count=e,this.unchangedNames=t}}function tY(e){if(void 0===e)return _("GRPC error has no .code"),C.UNKNOWN;switch(e){case r.OK:return C.OK;case r.CANCELLED:return C.CANCELLED;case r.UNKNOWN:return C.UNKNOWN;case r.DEADLINE_EXCEEDED:return C.DEADLINE_EXCEEDED;case r.RESOURCE_EXHAUSTED:return C.RESOURCE_EXHAUSTED;case r.INTERNAL:return C.INTERNAL;case r.UNAVAILABLE:return C.UNAVAILABLE;case r.UNAUTHENTICATED:return C.UNAUTHENTICATED;case r.INVALID_ARGUMENT:return C.INVALID_ARGUMENT;case r.NOT_FOUND:return C.NOT_FOUND;case r.ALREADY_EXISTS:return C.ALREADY_EXISTS;case r.PERMISSION_DENIED:return C.PERMISSION_DENIED;case r.FAILED_PRECONDITION:return C.FAILED_PRECONDITION;case r.ABORTED:return C.ABORTED;case r.OUT_OF_RANGE:return C.OUT_OF_RANGE;case r.UNIMPLEMENTED:return C.UNIMPLEMENTED;case r.DATA_LOSS:return C.DATA_LOSS;default:return I()}}(i=r||(r={}))[i.OK=0]="OK",i[i.CANCELLED=1]="CANCELLED",i[i.UNKNOWN=2]="UNKNOWN",i[i.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",i[i.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",i[i.NOT_FOUND=5]="NOT_FOUND",i[i.ALREADY_EXISTS=6]="ALREADY_EXISTS",i[i.PERMISSION_DENIED=7]="PERMISSION_DENIED",i[i.UNAUTHENTICATED=16]="UNAUTHENTICATED",i[i.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",i[i.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",i[i.ABORTED=10]="ABORTED",i[i.OUT_OF_RANGE=11]="OUT_OF_RANGE",i[i.UNIMPLEMENTED=12]="UNIMPLEMENTED",i[i.INTERNAL=13]="INTERNAL",i[i.UNAVAILABLE=14]="UNAVAILABLE",i[i.DATA_LOSS=15]="DATA_LOSS";/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let tX=new h.z8([4294967295,4294967295],0);function tJ(e){let t=(new TextEncoder).encode(e),n=new h.V8;return n.update(t),new Uint8Array(n.digest())}function tZ(e){let t=new DataView(e.buffer),n=t.getUint32(0,!0),r=t.getUint32(4,!0),i=t.getUint32(8,!0),s=t.getUint32(12,!0);return[new h.z8([n,r],0),new h.z8([i,s],0)]}class t${Ee(e,t,n){let r=e.add(t.multiply(h.z8.fromNumber(n)));return 1===r.compare(tX)&&(r=new h.z8([r.getBits(0),r.getBits(1)],0)),r.modulo(this.Te).toNumber()}de(e){return 0!=(this.bitmap[Math.floor(e/8)]&1<<e%8)}mightContain(e){if(0===this.Ie)return!1;let[t,n]=tZ(tJ(e));for(let e=0;e<this.hashCount;e++){let r=this.Ee(t,n,e);if(!this.de(r))return!1}return!0}static create(e,t,n){let r=new t$(new Uint8Array(Math.ceil(e/8)),e%8==0?0:8-e%8,t);return n.forEach(e=>r.insert(e)),r}insert(e){if(0===this.Ie)return;let[t,n]=tZ(tJ(e));for(let e=0;e<this.hashCount;e++){let r=this.Ee(t,n,e);this.Ae(r)}}Ae(e){this.bitmap[Math.floor(e/8)]|=1<<e%8}constructor(e,t,n){if(this.bitmap=e,this.padding=t,this.hashCount=n,t<0||t>=8)throw new t0("Invalid padding: ".concat(t));if(n<0||e.length>0&&0===this.hashCount)throw new t0("Invalid hash count: ".concat(n));if(0===e.length&&0!==t)throw new t0("Invalid padding when bitmap length is 0: ".concat(t));this.Ie=8*e.length-t,this.Te=h.z8.fromNumber(this.Ie)}}class t0 extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class t1{static createSynthesizedRemoteEventForCurrentChange(e,t,n){let r=new Map;return r.set(e,t2.createSynthesizedTargetChangeForCurrentChange(e,t,n)),new t1(U.min(),r,new en(O),tu,tp())}constructor(e,t,n,r,i){this.snapshotVersion=e,this.targetChanges=t,this.targetMismatches=n,this.documentUpdates=r,this.resolvedLimboDocuments=i}}class t2{static createSynthesizedTargetChangeForCurrentChange(e,t,n){return new t2(n,t,tp(),tp(),tp())}constructor(e,t,n,r,i){this.resumeToken=e,this.current=t,this.addedDocuments=n,this.modifiedDocuments=r,this.removedDocuments=i}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class t3{constructor(e,t,n,r){this.Re=e,this.removedTargetIds=t,this.key=n,this.Ve=r}}class t4{constructor(e,t){this.targetId=e,this.me=t}}class t9{constructor(e,t,n=eu.EMPTY_BYTE_STRING,r=null){this.state=e,this.targetIds=t,this.resumeToken=n,this.cause=r}}class t8{get current(){return this.ye}get resumeToken(){return this.pe}get Se(){return 0!==this.fe}get be(){return this.we}De(e){e.approximateByteSize()>0&&(this.we=!0,this.pe=e)}ve(){let e=tp(),t=tp(),n=tp();return this.ge.forEach((r,i)=>{switch(i){case 0:e=e.add(r);break;case 2:t=t.add(r);break;case 1:n=n.add(r);break;default:I()}}),new t2(this.pe,this.ye,e,t,n)}Ce(){this.we=!1,this.ge=t7()}Fe(e,t){this.we=!0,this.ge=this.ge.insert(e,t)}Me(e){this.we=!0,this.ge=this.ge.remove(e)}xe(){this.fe+=1}Oe(){this.fe-=1,this.fe>=0||I()}Ne(){this.we=!0,this.ye=!0}constructor(){this.fe=0,this.ge=t7(),this.pe=eu.EMPTY_BYTE_STRING,this.ye=!1,this.we=!0}}class t5{Ke(e){for(let t of e.Re)e.Ve&&e.Ve.isFoundDocument()?this.$e(t,e.Ve):this.Ue(t,e.key,e.Ve);for(let t of e.removedTargetIds)this.Ue(t,e.key,e.Ve)}We(e){this.forEachTarget(e,t=>{let n=this.Ge(t);switch(e.state){case 0:this.ze(t)&&n.De(e.resumeToken);break;case 1:n.Oe(),n.Se||n.Ce(),n.De(e.resumeToken);break;case 2:n.Oe(),n.Se||this.removeTarget(t);break;case 3:this.ze(t)&&(n.Ne(),n.De(e.resumeToken));break;case 4:this.ze(t)&&(this.je(t),n.De(e.resumeToken));break;default:I()}})}forEachTarget(e,t){e.targetIds.length>0?e.targetIds.forEach(t):this.Be.forEach((e,n)=>{this.ze(n)&&t(n)})}He(e){let t=e.targetId,n=e.me.count,r=this.Je(t);if(r){let i=r.target;if(e9(i)){if(0===n){let e=new Q(i.path);this.Ue(t,e,eF.newNoDocument(e,U.min()))}else 1===n||I()}else{let r=this.Ye(t);if(r!==n){let n=this.Ze(e),i=n?this.Xe(n,e,r):1;0!==i&&(this.je(t),this.Qe=this.Qe.insert(t,2===i?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch"))}}}}Ze(e){let t,n;let r=e.me.unchangedNames;if(!r||!r.bits)return null;let{bits:{bitmap:i="",padding:s=0},hashCount:a=0}=r;try{t=ef(i).toUint8Array()}catch(e){if(e instanceof el)return E("Decoding the base64 bloom filter in existence filter failed ("+e.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw e}try{n=new t$(t,s,a)}catch(e){return E(e instanceof t0?"BloomFilter error: ":"Applying bloom filter failed: ",e),null}return 0===n.Ie?null:n}Xe(e,t,n){return t.me.count===n-this.nt(e,t.targetId)?0:2}nt(e,t){let n=this.Le.getRemoteKeysForTarget(t),r=0;return n.forEach(n=>{let i=this.Le.tt(),s="projects/".concat(i.projectId,"/databases/").concat(i.database,"/documents/").concat(n.path.canonicalString());e.mightContain(s)||(this.Ue(t,n,null),r++)}),r}rt(e){let t=new Map;this.Be.forEach((n,r)=>{let i=this.Je(r);if(i){if(n.current&&e9(i.target)){let t=new Q(i.target.path);null!==this.ke.get(t)||this.it(r,t)||this.Ue(r,t,eF.newNoDocument(t,e))}n.be&&(t.set(r,n.ve()),n.Ce())}});let n=tp();this.qe.forEach((e,t)=>{let r=!0;t.forEachWhile(e=>{let t=this.Je(e);return!t||"TargetPurposeLimboResolution"===t.purpose||(r=!1,!1)}),r&&(n=n.add(e))}),this.ke.forEach((t,n)=>n.setReadTime(e));let r=new t1(e,t,this.Qe,this.ke,n);return this.ke=tu,this.qe=t6(),this.Qe=new en(O),r}$e(e,t){if(!this.ze(e))return;let n=this.it(e,t.key)?2:0;this.Ge(e).Fe(t.key,n),this.ke=this.ke.insert(t.key,t),this.qe=this.qe.insert(t.key,this.st(t.key).add(e))}Ue(e,t,n){if(!this.ze(e))return;let r=this.Ge(e);this.it(e,t)?r.Fe(t,1):r.Me(t),this.qe=this.qe.insert(t,this.st(t).delete(e)),n&&(this.ke=this.ke.insert(t,n))}removeTarget(e){this.Be.delete(e)}Ye(e){let t=this.Ge(e).ve();return this.Le.getRemoteKeysForTarget(e).size+t.addedDocuments.size-t.removedDocuments.size}xe(e){this.Ge(e).xe()}Ge(e){let t=this.Be.get(e);return t||(t=new t8,this.Be.set(e,t)),t}st(e){let t=this.qe.get(e);return t||(t=new es(O),this.qe=this.qe.insert(e,t)),t}ze(e){let t=null!==this.Je(e);return t||w("WatchChangeAggregator","Detected inactive target",e),t}Je(e){let t=this.Be.get(e);return t&&t.Se?null:this.Le.ot(e)}je(e){this.Be.set(e,new t8),this.Le.getRemoteKeysForTarget(e).forEach(t=>{this.Ue(e,t,null)})}it(e,t){return this.Le.getRemoteKeysForTarget(e).has(t)}constructor(e){this.Le=e,this.Be=new Map,this.ke=tu,this.qe=t6(),this.Qe=new en(O)}}function t6(){return new en(Q.comparator)}function t7(){return new en(Q.comparator)}let ne={asc:"ASCENDING",desc:"DESCENDING"},nt={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},nn={and:"AND",or:"OR"};class nr{constructor(e,t){this.databaseId=e,this.useProto3Json=t}}function ni(e,t){return e.useProto3Json||null==t?t:{value:t}}function ns(e,t){return e.useProto3Json?"".concat(new Date(1e3*t.seconds).toISOString().replace(/\.\d*/,"").replace("Z",""),".").concat(("000000000"+t.nanoseconds).slice(-9),"Z"):{seconds:""+t.seconds,nanos:t.nanoseconds}}function na(e,t){return e.useProto3Json?t.toBase64():t.toUint8Array()}function no(e){return e||I(),U.fromTimestamp(function(e){let t=eh(e);return new P(t.seconds,t.nanos)}(e))}function nl(e,t){return nu(e,t).canonicalString()}function nu(e,t){let n=new B(["projects",e.projectId,"databases",e.database]).child("documents");return void 0===t?n:n.child(t)}function nc(e){let t=B.fromString(e);return nw(t)||I(),t}function nh(e,t){return nl(e.databaseId,t.path)}function nd(e,t){let n=nc(t);if(n.get(1)!==e.databaseId.projectId)throw new A(C.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+n.get(1)+" vs "+e.databaseId.projectId);if(n.get(3)!==e.databaseId.database)throw new A(C.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+n.get(3)+" vs "+e.databaseId.database);return new Q(ng(n))}function nf(e,t){return nl(e.databaseId,t)}function nm(e){return new B(["projects",e.databaseId.projectId,"databases",e.databaseId.database]).canonicalString()}function ng(e){return e.length>4&&"documents"===e.get(4)||I(),e.popFirst(5)}function np(e,t,n){return{name:nh(e,t),fields:n.value.mapValue.fields}}function ny(e){return{fieldPath:e.canonicalString()}}function nv(e){return K.fromServerFormat(e.fieldPath)}function nw(e){return e.length>=4&&"projects"===e.get(0)&&"databases"===e.get(2)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class n_{withSequenceNumber(e){return new n_(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,t){return new n_(this.target,this.targetId,this.purpose,this.sequenceNumber,t,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new n_(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new n_(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}constructor(e,t,n,r,i=U.min(),s=U.min(),a=eu.EMPTY_BYTE_STRING,o=null){this.target=e,this.targetId=t,this.purpose=n,this.sequenceNumber=r,this.snapshotVersion=i,this.lastLimboFreeSnapshotVersion=s,this.resumeToken=a,this.expectedCount=o}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nE{constructor(e){this.ct=e}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nT{It(e,t){this.Tt(e,t),t.Et()}Tt(e,t){if("nullValue"in e)this.dt(t,5);else if("booleanValue"in e)this.dt(t,10),t.At(e.booleanValue?1:0);else if("integerValue"in e)this.dt(t,15),t.At(ed(e.integerValue));else if("doubleValue"in e){let n=ed(e.doubleValue);isNaN(n)?this.dt(t,13):(this.dt(t,15),Z(n)?t.At(0):t.At(n))}else if("timestampValue"in e){let n=e.timestampValue;this.dt(t,20),"string"==typeof n&&(n=eh(n)),t.Rt("".concat(n.seconds||"")),t.At(n.nanos||0)}else if("stringValue"in e)this.Vt(e.stringValue,t),this.ft(t);else if("bytesValue"in e)this.dt(t,30),t.gt(ef(e.bytesValue)),this.ft(t);else if("referenceValue"in e)this.yt(e.referenceValue,t);else if("geoPointValue"in e){let n=e.geoPointValue;this.dt(t,45),t.At(n.latitude||0),t.At(n.longitude||0)}else"mapValue"in e?eM(e)?this.dt(t,Number.MAX_SAFE_INTEGER):eL(e)?this.wt(e.mapValue,t):(this.St(e.mapValue,t),this.ft(t)):"arrayValue"in e?(this.bt(e.arrayValue,t),this.ft(t)):I()}Vt(e,t){this.dt(t,25),this.Dt(e,t)}Dt(e,t){t.Rt(e)}St(e,t){let n=e.fields||{};for(let e of(this.dt(t,55),Object.keys(n)))this.Vt(e,t),this.Tt(n[e],t)}wt(e,t){var n,r;let i=e.fields||{};this.dt(t,53);let s="value",a=(null===(r=null===(n=i[s].arrayValue)||void 0===n?void 0:n.values)||void 0===r?void 0:r.length)||0;this.dt(t,15),t.At(ed(a)),this.Vt(s,t),this.Tt(i[s],t)}bt(e,t){let n=e.values||[];for(let e of(this.dt(t,50),n))this.Tt(e,t)}yt(e,t){this.dt(t,37),Q.fromName(e).path.forEach(e=>{this.dt(t,60),this.Dt(e,t)})}dt(e,t){e.At(t)}ft(e){e.At(2)}constructor(){}}nT.vt=new nT;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nI{addToCollectionParentIndex(e,t){return this.un.add(t),Y.resolve()}getCollectionParents(e,t){return Y.resolve(this.un.getEntries(t))}addFieldIndex(e,t){return Y.resolve()}deleteFieldIndex(e,t){return Y.resolve()}deleteAllFieldIndexes(e){return Y.resolve()}createTargetIndexes(e,t){return Y.resolve()}getDocumentsMatchingTarget(e,t){return Y.resolve(null)}getIndexType(e,t){return Y.resolve(0)}getFieldIndexes(e,t){return Y.resolve([])}getNextCollectionGroupToUpdate(e){return Y.resolve(null)}getMinOffset(e,t){return Y.resolve(j.min())}getMinOffsetFromCollectionGroup(e,t){return Y.resolve(j.min())}updateCollectionGroup(e,t,n){return Y.resolve()}updateIndexEntries(e,t){return Y.resolve()}constructor(){this.un=new nC}}class nC{add(e){let t=e.lastSegment(),n=e.popLast(),r=this.index[t]||new es(B.comparator),i=!r.has(n);return this.index[t]=r.add(n),i}has(e){let t=e.lastSegment(),n=e.popLast(),r=this.index[t];return r&&r.has(n)}getEntries(e){return(this.index[e]||new es(B.comparator)).toArray()}constructor(){this.index={}}}new Uint8Array(0);class nA{static withCacheSize(e){return new nA(e,nA.DEFAULT_COLLECTION_PERCENTILE,nA.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}constructor(e,t,n){this.cacheSizeCollectionThreshold=e,this.percentileToCollect=t,this.maximumSequenceNumbersToCollect=n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */nA.DEFAULT_COLLECTION_PERCENTILE=10,nA.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,nA.DEFAULT=new nA(41943040,nA.DEFAULT_COLLECTION_PERCENTILE,nA.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),nA.DISABLED=new nA(-1,0,0);/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nS{next(){return this.Ln+=2,this.Ln}static Bn(){return new nS(0)}static kn(){return new nS(-1)}constructor(e){this.Ln=e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nN{addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,t){this.assertNotApplied(),this.changes.set(e,eF.newInvalidDocument(e).setReadTime(t))}getEntry(e,t){this.assertNotApplied();let n=this.changes.get(t);return void 0!==n?Y.resolve(n):this.getFromCache(e,t)}getEntries(e,t){return this.getAllFromCache(e,t)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}constructor(){this.changes=new tl(e=>e.toString(),(e,t)=>e.isEqual(t)),this.changesApplied=!1}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nk{constructor(e,t){this.overlayedDocument=e,this.mutatedFields=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nb{getDocument(e,t){let n=null;return this.documentOverlayCache.getOverlay(e,t).next(r=>(n=r,this.remoteDocumentCache.getEntry(e,t))).next(e=>(null!==n&&tO(n.mutation,e,eo.empty(),P.now()),e))}getDocuments(e,t){return this.remoteDocumentCache.getEntries(e,t).next(t=>this.getLocalViewOfDocuments(e,t,tp()).next(()=>t))}getLocalViewOfDocuments(e,t){let n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:tp(),r=tf();return this.populateOverlays(e,r,t).next(()=>this.computeViews(e,t,r,n).next(e=>{let t=th();return e.forEach((e,n)=>{t=t.insert(e,n.overlayedDocument)}),t}))}getOverlayedDocuments(e,t){let n=tf();return this.populateOverlays(e,n,t).next(()=>this.computeViews(e,t,n,tp()))}populateOverlays(e,t,n){let r=[];return n.forEach(e=>{t.has(e)||r.push(e)}),this.documentOverlayCache.getOverlays(e,r).next(e=>{e.forEach((e,n)=>{t.set(e,n)})})}computeViews(e,t,n,r){let i=tu,s=tf(),a=tf();return t.forEach((e,t)=>{let a=n.get(t.key);r.has(t.key)&&(void 0===a||a.mutation instanceof tU)?i=i.insert(t.key,t):void 0!==a?(s.set(t.key,a.mutation.getFieldMask()),tO(a.mutation,t,a.mutation.getFieldMask(),P.now())):s.set(t.key,eo.empty())}),this.recalculateAndSaveOverlays(e,i).next(e=>(e.forEach((e,t)=>s.set(e,t)),t.forEach((e,t)=>{var n;return a.set(e,new nk(t,null!==(n=s.get(e))&&void 0!==n?n:null))}),a))}recalculateAndSaveOverlays(e,t){let n=tf(),r=new en((e,t)=>e-t),i=tp();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,t).next(e=>{for(let i of e)i.keys().forEach(e=>{let s=t.get(e);if(null===s)return;let a=n.get(e)||eo.empty();a=i.applyToLocalView(s,a),n.set(e,a);let o=(r.get(i.batchId)||tp()).add(e);r=r.insert(i.batchId,o)})}).next(()=>{let s=[],a=r.getReverseIterator();for(;a.hasNext();){let r=a.getNext(),o=r.key,l=r.value,u=tf();l.forEach(e=>{if(!i.has(e)){let r=tM(t.get(e),n.get(e));null!==r&&u.set(e,r),i=i.add(e)}}),s.push(this.documentOverlayCache.saveOverlays(e,o,u))}return Y.waitFor(s)}).next(()=>n)}recalculateAndSaveOverlaysForDocumentKeys(e,t){return this.remoteDocumentCache.getEntries(e,t).next(t=>this.recalculateAndSaveOverlays(e,t))}getDocumentsMatchingQuery(e,t,n,r){return Q.isDocumentKey(t.path)&&null===t.collectionGroup&&0===t.filters.length?this.getDocumentsMatchingDocumentQuery(e,t.path):e6(t)?this.getDocumentsMatchingCollectionGroupQuery(e,t,n,r):this.getDocumentsMatchingCollectionQuery(e,t,n,r)}getNextDocuments(e,t,n,r){return this.remoteDocumentCache.getAllFromCollectionGroup(e,t,n,r).next(i=>{let s=r-i.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,t,n.largestBatchId,r-i.size):Y.resolve(tf()),a=-1,o=i;return s.next(t=>Y.forEach(t,(t,n)=>(a<n.largestBatchId&&(a=n.largestBatchId),i.get(t)?Y.resolve():this.remoteDocumentCache.getEntry(e,t).next(e=>{o=o.insert(t,e)}))).next(()=>this.populateOverlays(e,t,i)).next(()=>this.computeViews(e,o,t,tp())).next(e=>({batchId:a,changes:td(e)})))})}getDocumentsMatchingDocumentQuery(e,t){return this.getDocument(e,new Q(t)).next(e=>{let t=th();return e.isFoundDocument()&&(t=t.insert(e.key,e)),t})}getDocumentsMatchingCollectionGroupQuery(e,t,n,r){let i=t.collectionGroup,s=th();return this.indexManager.getCollectionParents(e,i).next(a=>Y.forEach(a,a=>{let o=new e8(a.child(i),null,t.explicitOrderBy.slice(),t.filters.slice(),t.limit,t.limitType,t.startAt,t.endAt);return this.getDocumentsMatchingCollectionQuery(e,o,n,r).next(e=>{e.forEach((e,t)=>{s=s.insert(e,t)})})}).next(()=>s))}getDocumentsMatchingCollectionQuery(e,t,n,r){let i;return this.documentOverlayCache.getOverlaysForCollection(e,t.path,n.largestBatchId).next(s=>(i=s,this.remoteDocumentCache.getDocumentsMatchingQuery(e,t,n,i,r))).next(e=>{i.forEach((t,n)=>{let r=n.getKey();null===e.get(r)&&(e=e.insert(r,eF.newInvalidDocument(r)))});let n=th();return e.forEach((e,r)=>{let s=i.get(e);void 0!==s&&tO(s.mutation,r,eo.empty(),P.now()),ta(t,r)&&(n=n.insert(e,r))}),n})}constructor(e,t,n,r){this.remoteDocumentCache=e,this.mutationQueue=t,this.documentOverlayCache=n,this.indexManager=r}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nD{getBundleMetadata(e,t){return Y.resolve(this.hr.get(t))}saveBundleMetadata(e,t){return this.hr.set(t.id,{id:t.id,version:t.version,createTime:no(t.createTime)}),Y.resolve()}getNamedQuery(e,t){return Y.resolve(this.Pr.get(t))}saveNamedQuery(e,t){return this.Pr.set(t.name,{name:t.name,query:function(e){let t=function(e){var t;let n,r=function(e){let t=nc(e);return 4===t.length?B.emptyPath():ng(t)}(e.parent),i=e.structuredQuery,s=i.from?i.from.length:0,a=null;if(s>0){1===s||I();let e=i.from[0];e.allDescendants?a=e.collectionId:r=r.child(e.collectionId)}let o=[];i.where&&(o=function(e){var t;let n=function e(t){return void 0!==t.unaryFilter?function(e){switch(e.unaryFilter.op){case"IS_NAN":let t=nv(e.unaryFilter.field);return eK.create(t,"==",{doubleValue:NaN});case"IS_NULL":let n=nv(e.unaryFilter.field);return eK.create(n,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":let r=nv(e.unaryFilter.field);return eK.create(r,"!=",{doubleValue:NaN});case"IS_NOT_NULL":let i=nv(e.unaryFilter.field);return eK.create(i,"!=",{nullValue:"NULL_VALUE"});default:return I()}}(t):void 0!==t.fieldFilter?eK.create(nv(t.fieldFilter.field),function(e){switch(e){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";default:return I()}}(t.fieldFilter.op),t.fieldFilter.value):void 0!==t.compositeFilter?eQ.create(t.compositeFilter.filters.map(t=>e(t)),function(e){switch(e){case"AND":return"and";case"OR":return"or";default:return I()}}(t.compositeFilter.op)):I()}(e);return n instanceof eQ&&ej(t=n)&&eG(t)?n.getFilters():[n]}(i.where));let l=[];i.orderBy&&(l=i.orderBy.map(e=>new eB(nv(e.field),function(e){switch(e){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}}(e.direction))));let u=null;i.limit&&(u=null==(n="object"==typeof(t=i.limit)?t.value:t)?null:n);let c=null;i.startAt&&(c=function(e){let t=!!e.before;return new eP(e.values||[],t)}(i.startAt));let h=null;return i.endAt&&(h=function(e){let t=!e.before;return new eP(e.values||[],t)}(i.endAt)),new e8(r,a,l,o,u,"F",c,h)}({parent:e.parent,structuredQuery:e.structuredQuery});return"LAST"===e.limitType?tn(t,t.limit,"L"):t}(t.bundledQuery),readTime:no(t.readTime)}),Y.resolve()}constructor(e){this.serializer=e,this.hr=new Map,this.Pr=new Map}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nR{getOverlay(e,t){return Y.resolve(this.overlays.get(t))}getOverlays(e,t){let n=tf();return Y.forEach(t,t=>this.getOverlay(e,t).next(e=>{null!==e&&n.set(t,e)})).next(()=>n)}saveOverlays(e,t,n){return n.forEach((n,r)=>{this.ht(e,t,r)}),Y.resolve()}removeOverlaysForBatchId(e,t,n){let r=this.Ir.get(n);return void 0!==r&&(r.forEach(e=>this.overlays=this.overlays.remove(e)),this.Ir.delete(n)),Y.resolve()}getOverlaysForCollection(e,t,n){let r=tf(),i=t.length+1,s=new Q(t.child("")),a=this.overlays.getIteratorFrom(s);for(;a.hasNext();){let e=a.getNext().value,s=e.getKey();if(!t.isPrefixOf(s.path))break;s.path.length===i&&e.largestBatchId>n&&r.set(e.getKey(),e)}return Y.resolve(r)}getOverlaysForCollectionGroup(e,t,n,r){let i=new en((e,t)=>e-t),s=this.overlays.getIterator();for(;s.hasNext();){let e=s.getNext().value;if(e.getKey().getCollectionGroup()===t&&e.largestBatchId>n){let t=i.get(e.largestBatchId);null===t&&(t=tf(),i=i.insert(e.largestBatchId,t)),t.set(e.getKey(),e)}}let a=tf(),o=i.getIterator();for(;o.hasNext()&&(o.getNext().value.forEach((e,t)=>a.set(e,t)),!(a.size()>=r)););return Y.resolve(a)}ht(e,t,n){let r=this.overlays.get(n.key);if(null!==r){let e=this.Ir.get(r.largestBatchId).delete(n.key);this.Ir.set(r.largestBatchId,e)}this.overlays=this.overlays.insert(n.key,new tW(t,n));let i=this.Ir.get(t);void 0===i&&(i=tp(),this.Ir.set(t,i)),this.Ir.set(t,i.add(n.key))}constructor(){this.overlays=new en(Q.comparator),this.Ir=new Map}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nx{getSessionToken(e){return Y.resolve(this.sessionToken)}setSessionToken(e,t){return this.sessionToken=t,Y.resolve()}constructor(){this.sessionToken=eu.EMPTY_BYTE_STRING}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nL{isEmpty(){return this.Tr.isEmpty()}addReference(e,t){let n=new nV(e,t);this.Tr=this.Tr.add(n),this.dr=this.dr.add(n)}Rr(e,t){e.forEach(e=>this.addReference(e,t))}removeReference(e,t){this.Vr(new nV(e,t))}mr(e,t){e.forEach(e=>this.removeReference(e,t))}gr(e){let t=new Q(new B([])),n=new nV(t,e),r=new nV(t,e+1),i=[];return this.dr.forEachInRange([n,r],e=>{this.Vr(e),i.push(e.key)}),i}pr(){this.Tr.forEach(e=>this.Vr(e))}Vr(e){this.Tr=this.Tr.delete(e),this.dr=this.dr.delete(e)}yr(e){let t=new Q(new B([])),n=new nV(t,e),r=new nV(t,e+1),i=tp();return this.dr.forEachInRange([n,r],e=>{i=i.add(e.key)}),i}containsKey(e){let t=new nV(e,0),n=this.Tr.firstAfterOrEqual(t);return null!==n&&e.isEqual(n.key)}constructor(){this.Tr=new es(nV.Er),this.dr=new es(nV.Ar)}}class nV{static Er(e,t){return Q.comparator(e.key,t.key)||O(e.wr,t.wr)}static Ar(e,t){return O(e.wr,t.wr)||Q.comparator(e.key,t.key)}constructor(e,t){this.key=e,this.wr=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nM{checkEmpty(e){return Y.resolve(0===this.mutationQueue.length)}addMutationBatch(e,t,n,r){let i=this.Sr;this.Sr++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];let s=new tG(i,t,n,r);for(let t of(this.mutationQueue.push(s),r))this.br=this.br.add(new nV(t.key,i)),this.indexManager.addToCollectionParentIndex(e,t.key.path.popLast());return Y.resolve(s)}lookupMutationBatch(e,t){return Y.resolve(this.Dr(t))}getNextMutationBatchAfterBatchId(e,t){let n=this.vr(t+1),r=n<0?0:n;return Y.resolve(this.mutationQueue.length>r?this.mutationQueue[r]:null)}getHighestUnacknowledgedBatchId(){return Y.resolve(0===this.mutationQueue.length?-1:this.Sr-1)}getAllMutationBatches(e){return Y.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,t){let n=new nV(t,0),r=new nV(t,Number.POSITIVE_INFINITY),i=[];return this.br.forEachInRange([n,r],e=>{let t=this.Dr(e.wr);i.push(t)}),Y.resolve(i)}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new es(O);return t.forEach(e=>{let t=new nV(e,0),r=new nV(e,Number.POSITIVE_INFINITY);this.br.forEachInRange([t,r],e=>{n=n.add(e.wr)})}),Y.resolve(this.Cr(n))}getAllMutationBatchesAffectingQuery(e,t){let n=t.path,r=n.length+1,i=n;Q.isDocumentKey(i)||(i=i.child(""));let s=new nV(new Q(i),0),a=new es(O);return this.br.forEachWhile(e=>{let t=e.key.path;return!!n.isPrefixOf(t)&&(t.length===r&&(a=a.add(e.wr)),!0)},s),Y.resolve(this.Cr(a))}Cr(e){let t=[];return e.forEach(e=>{let n=this.Dr(e);null!==n&&t.push(n)}),t}removeMutationBatch(e,t){0===this.Fr(t.batchId,"removed")||I(),this.mutationQueue.shift();let n=this.br;return Y.forEach(t.mutations,r=>{let i=new nV(r.key,t.batchId);return n=n.delete(i),this.referenceDelegate.markPotentiallyOrphaned(e,r.key)}).next(()=>{this.br=n})}On(e){}containsKey(e,t){let n=new nV(t,0),r=this.br.firstAfterOrEqual(n);return Y.resolve(t.isEqual(r&&r.key))}performConsistencyCheck(e){return this.mutationQueue.length,Y.resolve()}Fr(e,t){return this.vr(e)}vr(e){return 0===this.mutationQueue.length?0:e-this.mutationQueue[0].batchId}Dr(e){let t=this.vr(e);return t<0||t>=this.mutationQueue.length?null:this.mutationQueue[t]}constructor(e,t){this.indexManager=e,this.referenceDelegate=t,this.mutationQueue=[],this.Sr=1,this.br=new es(nV.Er)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nO{setIndexManager(e){this.indexManager=e}addEntry(e,t){let n=t.key,r=this.docs.get(n),i=r?r.size:0,s=this.Mr(t);return this.docs=this.docs.insert(n,{document:t.mutableCopy(),size:s}),this.size+=s-i,this.indexManager.addToCollectionParentIndex(e,n.path.popLast())}removeEntry(e){let t=this.docs.get(e);t&&(this.docs=this.docs.remove(e),this.size-=t.size)}getEntry(e,t){let n=this.docs.get(t);return Y.resolve(n?n.document.mutableCopy():eF.newInvalidDocument(t))}getEntries(e,t){let n=tu;return t.forEach(e=>{let t=this.docs.get(e);n=n.insert(e,t?t.document.mutableCopy():eF.newInvalidDocument(e))}),Y.resolve(n)}getDocumentsMatchingQuery(e,t,n,r){let i=tu,s=t.path,a=new Q(s.child("")),o=this.docs.getIteratorFrom(a);for(;o.hasNext();){let{key:e,value:{document:a}}=o.getNext();if(!s.isPrefixOf(e.path))break;e.path.length>s.length+1||0>=function(e,t){let n=e.readTime.compareTo(t.readTime);return 0!==n?n:0!==(n=Q.comparator(e.documentKey,t.documentKey))?n:O(e.largestBatchId,t.largestBatchId)}(new j(a.readTime,a.key,-1),n)||(r.has(a.key)||ta(t,a))&&(i=i.insert(a.key,a.mutableCopy()))}return Y.resolve(i)}getAllFromCollectionGroup(e,t,n,r){I()}Or(e,t){return Y.forEach(this.docs,e=>t(e))}newChangeBuffer(e){return new nF(this)}getSize(e){return Y.resolve(this.size)}constructor(e){this.Mr=e,this.docs=new en(Q.comparator),this.size=0}}class nF extends nN{applyChanges(e){let t=[];return this.changes.forEach((n,r)=>{r.isValidDocument()?t.push(this.cr.addEntry(e,r)):this.cr.removeEntry(n)}),Y.waitFor(t)}getFromCache(e,t){return this.cr.getEntry(e,t)}getAllFromCache(e,t){return this.cr.getEntries(e,t)}constructor(e){super(),this.cr=e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nP{forEachTarget(e,t){return this.Nr.forEach((e,n)=>t(n)),Y.resolve()}getLastRemoteSnapshotVersion(e){return Y.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return Y.resolve(this.Lr)}allocateTargetId(e){return this.highestTargetId=this.kr.next(),Y.resolve(this.highestTargetId)}setTargetsMetadata(e,t,n){return n&&(this.lastRemoteSnapshotVersion=n),t>this.Lr&&(this.Lr=t),Y.resolve()}Kn(e){this.Nr.set(e.target,e);let t=e.targetId;t>this.highestTargetId&&(this.kr=new nS(t),this.highestTargetId=t),e.sequenceNumber>this.Lr&&(this.Lr=e.sequenceNumber)}addTargetData(e,t){return this.Kn(t),this.targetCount+=1,Y.resolve()}updateTargetData(e,t){return this.Kn(t),Y.resolve()}removeTargetData(e,t){return this.Nr.delete(t.target),this.Br.gr(t.targetId),this.targetCount-=1,Y.resolve()}removeTargets(e,t,n){let r=0,i=[];return this.Nr.forEach((s,a)=>{a.sequenceNumber<=t&&null===n.get(a.targetId)&&(this.Nr.delete(s),i.push(this.removeMatchingKeysForTargetId(e,a.targetId)),r++)}),Y.waitFor(i).next(()=>r)}getTargetCount(e){return Y.resolve(this.targetCount)}getTargetData(e,t){let n=this.Nr.get(t)||null;return Y.resolve(n)}addMatchingKeys(e,t,n){return this.Br.Rr(t,n),Y.resolve()}removeMatchingKeys(e,t,n){this.Br.mr(t,n);let r=this.persistence.referenceDelegate,i=[];return r&&t.forEach(t=>{i.push(r.markPotentiallyOrphaned(e,t))}),Y.waitFor(i)}removeMatchingKeysForTargetId(e,t){return this.Br.gr(t),Y.resolve()}getMatchingKeysForTargetId(e,t){let n=this.Br.yr(t);return Y.resolve(n)}containsKey(e,t){return Y.resolve(this.Br.containsKey(t))}constructor(e){this.persistence=e,this.Nr=new tl(e=>e3(e),e4),this.lastRemoteSnapshotVersion=U.min(),this.highestTargetId=0,this.Lr=0,this.Br=new nL,this.targetCount=0,this.kr=nS.Bn()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nU{start(){return Promise.resolve()}shutdown(){return this.Kr=!1,Promise.resolve()}get started(){return this.Kr}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let t=this.overlays[e.toKey()];return t||(t=new nR,this.overlays[e.toKey()]=t),t}getMutationQueue(e,t){let n=this.qr[e.toKey()];return n||(n=new nM(t,this.referenceDelegate),this.qr[e.toKey()]=n),n}getGlobalsCache(){return this.$r}getTargetCache(){return this.Ur}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Gr}runTransaction(e,t,n){w("MemoryPersistence","Starting transaction:",e);let r=new nq(this.Qr.next());return this.referenceDelegate.zr(),n(r).next(e=>this.referenceDelegate.jr(r).next(()=>e)).toPromise().then(e=>(r.raiseOnCommittedEvent(),e))}Hr(e,t){return Y.or(Object.values(this.qr).map(n=>()=>n.containsKey(e,t)))}constructor(e,t){this.qr={},this.overlays={},this.Qr=new J(0),this.Kr=!1,this.Kr=!0,this.$r=new nx,this.referenceDelegate=e(this),this.Ur=new nP(this),this.indexManager=new nI,this.remoteDocumentCache=new nO(e=>this.referenceDelegate.Wr(e)),this.serializer=new nE(t),this.Gr=new nD(this.serializer)}}class nq extends W{constructor(e){super(),this.currentSequenceNumber=e}}class nB{static Zr(e){return new nB(e)}get Xr(){if(this.Yr)return this.Yr;throw I()}addReference(e,t,n){return this.Jr.addReference(n,t),this.Xr.delete(n.toString()),Y.resolve()}removeReference(e,t,n){return this.Jr.removeReference(n,t),this.Xr.add(n.toString()),Y.resolve()}markPotentiallyOrphaned(e,t){return this.Xr.add(t.toString()),Y.resolve()}removeTarget(e,t){this.Jr.gr(t.targetId).forEach(e=>this.Xr.add(e.toString()));let n=this.persistence.getTargetCache();return n.getMatchingKeysForTargetId(e,t.targetId).next(e=>{e.forEach(e=>this.Xr.add(e.toString()))}).next(()=>n.removeTargetData(e,t))}zr(){this.Yr=new Set}jr(e){let t=this.persistence.getRemoteDocumentCache().newChangeBuffer();return Y.forEach(this.Xr,n=>{let r=Q.fromPath(n);return this.ei(e,r).next(e=>{e||t.removeEntry(r,U.min())})}).next(()=>(this.Yr=null,t.apply(e)))}updateLimboDocument(e,t){return this.ei(e,t).next(e=>{e?this.Xr.delete(t.toString()):this.Xr.add(t.toString())})}Wr(e){return 0}ei(e,t){return Y.or([()=>Y.resolve(this.Jr.containsKey(t)),()=>this.persistence.getTargetCache().containsKey(e,t),()=>this.persistence.Hr(e,t)])}constructor(e){this.persistence=e,this.Jr=new nL,this.Yr=null}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nz{static Wi(e,t){let n=tp(),r=tp();for(let e of t.docChanges)switch(e.type){case 0:n=n.add(e.doc.key);break;case 1:r=r.add(e.doc.key)}return new nz(e,t.fromCache,n,r)}constructor(e,t,n,r){this.targetId=e,this.fromCache=t,this.$i=n,this.Ui=r}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nK{get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}constructor(){this._documentReadCount=0}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nQ{initialize(e,t){this.Ji=e,this.indexManager=t,this.Gi=!0}getDocumentsMatchingQuery(e,t,n,r){let i={result:null};return this.Yi(e,t).next(e=>{i.result=e}).next(()=>{if(!i.result)return this.Zi(e,t,r,n).next(e=>{i.result=e})}).next(()=>{if(i.result)return;let n=new nK;return this.Xi(e,t,n).next(r=>{if(i.result=r,this.zi)return this.es(e,t,n,r.size)})}).next(()=>i.result)}es(e,t,n,r){return n.documentReadCount<this.ji?(v()<=u.in.DEBUG&&w("QueryEngine","SDK will not create cache indexes for query:",ts(t),"since it only creates cache indexes for collection contains","more than or equal to",this.ji,"documents"),Y.resolve()):(v()<=u.in.DEBUG&&w("QueryEngine","Query:",ts(t),"scans",n.documentReadCount,"local documents and returns",r,"documents as results."),n.documentReadCount>this.Hi*r?(v()<=u.in.DEBUG&&w("QueryEngine","The SDK decides to create cache indexes for query:",ts(t),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,te(t))):Y.resolve())}Yi(e,t){if(e5(t))return Y.resolve(null);let n=te(t);return this.indexManager.getIndexType(e,n).next(r=>0===r?null:(null!==t.limit&&1===r&&(n=te(t=tn(t,null,"F"))),this.indexManager.getDocumentsMatchingTarget(e,n).next(r=>{let i=tp(...r);return this.Ji.getDocuments(e,i).next(r=>this.indexManager.getMinOffset(e,n).next(n=>{let s=this.ts(t,r);return this.ns(t,s,i,n.readTime)?this.Yi(e,tn(t,null,"F")):this.rs(e,s,t,n)}))})))}Zi(e,t,n,r){return e5(t)||r.isEqual(U.min())?Y.resolve(null):this.Ji.getDocuments(e,n).next(i=>{let s=this.ts(t,i);return this.ns(t,s,n,r)?Y.resolve(null):(v()<=u.in.DEBUG&&w("QueryEngine","Re-using previous result from %s to execute query: %s",r.toString(),ts(t)),this.rs(e,s,t,function(e,t){let n=e.toTimestamp().seconds,r=e.toTimestamp().nanoseconds+1;return new j(U.fromTimestamp(1e9===r?new P(n+1,0):new P(n,r)),Q.empty(),-1)}(r,0)).next(e=>e))})}ts(e,t){let n=new es(to(e));return t.forEach((t,r)=>{ta(e,r)&&(n=n.add(r))}),n}ns(e,t,n,r){if(null===e.limit)return!1;if(n.size!==t.size)return!0;let i="F"===e.limitType?t.last():t.first();return!!i&&(i.hasPendingWrites||i.version.compareTo(r)>0)}Xi(e,t,n){return v()<=u.in.DEBUG&&w("QueryEngine","Using full collection scan to execute query:",ts(t)),this.Ji.getDocumentsMatchingQuery(e,t,j.min(),n)}rs(e,t,n,r){return this.Ji.getDocumentsMatchingQuery(e,n,r).next(e=>(t.forEach(t=>{e=e.insert(t.key,t)}),e))}constructor(){this.Gi=!1,this.zi=!1,this.ji=100,this.Hi=(0,c.G6)()?8:function(e){let t=e.match(/Android ([\d.]+)/i);return Number(t?t[1].split(".").slice(0,2).join("."):"-1")}((0,c.z$)())>0?6:4}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nG{ls(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new nb(this.cs,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.cs.setIndexManager(this.indexManager),this.ss.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",t=>e.collect(t,this.os))}constructor(e,t,n,r){this.persistence=e,this.ss=t,this.serializer=r,this.os=new en(O),this._s=new tl(e=>e3(e),e4),this.us=new Map,this.cs=e.getRemoteDocumentCache(),this.Ur=e.getTargetCache(),this.Gr=e.getBundleCache(),this.ls(n)}}async function nj(e,t){return await e.persistence.runTransaction("Handle user change","readonly",n=>{let r;return e.mutationQueue.getAllMutationBatches(n).next(i=>(r=i,e.ls(t),e.mutationQueue.getAllMutationBatches(n))).next(t=>{let i=[],s=[],a=tp();for(let e of r)for(let t of(i.push(e.batchId),e.mutations))a=a.add(t.key);for(let e of t)for(let t of(s.push(e.batchId),e.mutations))a=a.add(t.key);return e.localDocuments.getDocuments(n,a).next(e=>({hs:e,removedBatchIds:i,addedBatchIds:s}))})})}function nW(e){return e.persistence.runTransaction("Get last remote snapshot version","readonly",t=>e.Ur.getLastRemoteSnapshotVersion(t))}async function nH(e,t,n){let r=e.os.get(t);try{n||await e.persistence.runTransaction("Release target",n?"readwrite":"readwrite-primary",t=>e.persistence.referenceDelegate.removeTarget(t,r))}catch(e){if(!X(e))throw e;w("LocalStore","Failed to update sequence numbers for target ".concat(t,": ").concat(e))}e.os=e.os.remove(t),e._s.delete(r.target)}function nY(e,t,n){let r=U.min(),i=tp();return e.persistence.runTransaction("Execute query","readwrite",s=>(function(e,t,n){let r=e._s.get(n);return void 0!==r?Y.resolve(e.os.get(r)):e.Ur.getTargetData(t,n)})(e,s,te(t)).next(t=>{if(t)return r=t.lastLimboFreeSnapshotVersion,e.Ur.getMatchingKeysForTargetId(s,t.targetId).next(e=>{i=e})}).next(()=>e.ss.getDocumentsMatchingQuery(s,t,n?r:U.min(),n?i:tp())).next(n=>{var r;let s;return r=t.collectionGroup||(t.path.length%2==1?t.path.lastSegment():t.path.get(t.path.length-2)),s=e.us.get(r)||U.min(),n.forEach((e,t)=>{t.readTime.compareTo(s)>0&&(s=t.readTime)}),e.us.set(r,s),{documents:n,Ts:i}}))}class nX{fs(e){this.activeTargetIds=this.activeTargetIds.add(e)}gs(e){this.activeTargetIds=this.activeTargetIds.delete(e)}Vs(){return JSON.stringify({activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()})}constructor(){this.activeTargetIds=ty}}class nJ{addPendingMutation(e){}updateMutationState(e,t,n){}addLocalQueryTarget(e){let t=!(arguments.length>1)||void 0===arguments[1]||arguments[1];return t&&this.so.fs(e),this.oo[e]||"not-current"}updateQueryState(e,t,n){this.oo[e]=t}removeLocalQueryTarget(e){this.so.gs(e)}isLocalQueryTarget(e){return this.so.activeTargetIds.has(e)}clearQueryState(e){delete this.oo[e]}getAllActiveQueryTargets(){return this.so.activeTargetIds}isActiveQueryTarget(e){return this.so.activeTargetIds.has(e)}start(){return this.so=new nX,Promise.resolve()}handleUserChange(e,t,n){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}constructor(){this.so=new nX,this.oo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nZ{_o(e){}shutdown(){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class n${_o(e){this.ho.push(e)}shutdown(){window.removeEventListener("online",this.ao),window.removeEventListener("offline",this.co)}Po(){window.addEventListener("online",this.ao),window.addEventListener("offline",this.co)}uo(){for(let e of(w("ConnectivityMonitor","Network connectivity changed: AVAILABLE"),this.ho))e(0)}lo(){for(let e of(w("ConnectivityMonitor","Network connectivity changed: UNAVAILABLE"),this.ho))e(1)}static D(){return void 0!==window.addEventListener&&void 0!==window.removeEventListener}constructor(){this.ao=()=>this.uo(),this.co=()=>this.lo(),this.ho=[],this.Po()}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let n0=null;function n1(){return null===n0?n0=268435456+Math.round(2147483648*Math.random()):n0++,"0x"+n0.toString(16)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let n2={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery"};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class n3{Eo(e){this.Ao=e}Ro(e){this.Vo=e}mo(e){this.fo=e}onMessage(e){this.po=e}close(){this.To()}send(e){this.Io(e)}yo(){this.Ao()}wo(){this.Vo()}So(e){this.fo(e)}bo(e){this.po(e)}constructor(e){this.Io=e.Io,this.To=e.To}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let n4="WebChannelConnection";class n9 extends class{get Fo(){return!1}Mo(e,t,n,r,i){let s=n1(),a=this.xo(e,t.toUriEncodedString());w("RestConnection","Sending RPC '".concat(e,"' ").concat(s,":"),a,n);let o={"google-cloud-resource-prefix":this.vo,"x-goog-request-params":this.Co};return this.Oo(o,r,i),this.No(e,a,o,n).then(t=>(w("RestConnection","Received RPC '".concat(e,"' ").concat(s,": "),t),t),t=>{throw E("RestConnection","RPC '".concat(e,"' ").concat(s," failed with error: "),t,"url: ",a,"request:",n),t})}Lo(e,t,n,r,i,s){return this.Mo(e,t,n,r,i)}Oo(e,t,n){e["X-Goog-Api-Client"]=function(){return"gl-js/ fire/"+p}(),e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),t&&t.headers.forEach((t,n)=>e[n]=t),n&&n.headers.forEach((t,n)=>e[n]=t)}xo(e,t){let n=n2[e];return"".concat(this.Do,"/v1/").concat(t,":").concat(n)}terminate(){}constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;let t=e.ssl?"https":"http",n=encodeURIComponent(this.databaseId.projectId),r=encodeURIComponent(this.databaseId.database);this.Do=t+"://"+e.host,this.vo="projects/".concat(n,"/databases/").concat(r),this.Co="(default)"===this.databaseId.database?"project_id=".concat(n):"project_id=".concat(n,"&database_id=").concat(r)}}{No(e,t,n,r){let i=n1();return new Promise((s,a)=>{let o=new d.JJ;o.setWithCredentials(!0),o.listenOnce(d.tw.COMPLETE,()=>{try{switch(o.getLastErrorCode()){case d.jK.NO_ERROR:let t=o.getResponseJson();w(n4,"XHR for RPC '".concat(e,"' ").concat(i," received:"),JSON.stringify(t)),s(t);break;case d.jK.TIMEOUT:w(n4,"RPC '".concat(e,"' ").concat(i," timed out")),a(new A(C.DEADLINE_EXCEEDED,"Request time out"));break;case d.jK.HTTP_ERROR:let n=o.getStatus();if(w(n4,"RPC '".concat(e,"' ").concat(i," failed with status:"),n,"response text:",o.getResponseText()),n>0){let e=o.getResponseJson();Array.isArray(e)&&(e=e[0]);let t=null==e?void 0:e.error;if(t&&t.status&&t.message){let e=function(e){let t=e.toLowerCase().replace(/_/g,"-");return Object.values(C).indexOf(t)>=0?t:C.UNKNOWN}(t.status);a(new A(e,t.message))}else a(new A(C.UNKNOWN,"Server responded with status "+o.getStatus()))}else a(new A(C.UNAVAILABLE,"Connection failed."));break;default:I()}}finally{w(n4,"RPC '".concat(e,"' ").concat(i," completed."))}});let l=JSON.stringify(r);w(n4,"RPC '".concat(e,"' ").concat(i," sending request:"),r),o.send(t,"POST",l,n,15)})}Bo(e,t,n){let i=n1(),s=[this.Do,"/","google.firestore.v1.Firestore","/",e,"/channel"],a=(0,d.UE)(),o=(0,d.FJ)(),l={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:"projects/".concat(this.databaseId.projectId,"/databases/").concat(this.databaseId.database)},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},u=this.longPollingOptions.timeoutSeconds;void 0!==u&&(l.longPollingTimeout=Math.round(1e3*u)),this.useFetchStreams&&(l.useFetchStreams=!0),this.Oo(l.initMessageHeaders,t,n),l.encodeInitMessageHeaders=!0;let c=s.join("");w(n4,"Creating RPC '".concat(e,"' stream ").concat(i,": ").concat(c),l);let h=a.createWebChannel(c,l),f=!1,m=!1,g=new n3({Io:t=>{m?w(n4,"Not sending because RPC '".concat(e,"' stream ").concat(i," is closed:"),t):(f||(w(n4,"Opening RPC '".concat(e,"' stream ").concat(i," transport.")),h.open(),f=!0),w(n4,"RPC '".concat(e,"' stream ").concat(i," sending:"),t),h.send(t))},To:()=>h.close()}),p=(e,t,n)=>{e.listen(t,e=>{try{n(e)}catch(e){setTimeout(()=>{throw e},0)}})};return p(h,d.ii.EventType.OPEN,()=>{m||(w(n4,"RPC '".concat(e,"' stream ").concat(i," transport opened.")),g.yo())}),p(h,d.ii.EventType.CLOSE,()=>{m||(m=!0,w(n4,"RPC '".concat(e,"' stream ").concat(i," transport closed")),g.So())}),p(h,d.ii.EventType.ERROR,t=>{m||(m=!0,E(n4,"RPC '".concat(e,"' stream ").concat(i," transport errored:"),t),g.So(new A(C.UNAVAILABLE,"The operation could not be completed")))}),p(h,d.ii.EventType.MESSAGE,t=>{var n;if(!m){let s=t.data[0];s||I();let a=s.error||(null===(n=s[0])||void 0===n?void 0:n.error);if(a){w(n4,"RPC '".concat(e,"' stream ").concat(i," received error:"),a);let t=a.status,n=function(e){let t=r[e];if(void 0!==t)return tY(t)}(t),s=a.message;void 0===n&&(n=C.INTERNAL,s="Unknown error status: "+t+" with message "+a.message),m=!0,g.So(new A(n,s)),h.close()}else w(n4,"RPC '".concat(e,"' stream ").concat(i," received:"),s),g.bo(s)}}),p(o,d.ju.STAT_EVENT,t=>{t.stat===d.kN.PROXY?w(n4,"RPC '".concat(e,"' stream ").concat(i," detected buffering proxy")):t.stat===d.kN.NOPROXY&&w(n4,"RPC '".concat(e,"' stream ").concat(i," detected no buffering proxy"))}),setTimeout(()=>{g.wo()},0),g}constructor(e){super(e),this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}}function n8(){return"undefined"!=typeof document?document:null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function n5(e){return new nr(e,!0)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class n6{reset(){this.Ko=0}Wo(){this.Ko=this.Qo}Go(e){this.cancel();let t=Math.floor(this.Ko+this.zo()),n=Math.max(0,Date.now()-this.Uo),r=Math.max(0,t-n);r>0&&w("ExponentialBackoff","Backing off for ".concat(r," ms (base delay: ").concat(this.Ko," ms, delay with jitter: ").concat(t," ms, last attempt: ").concat(n," ms ago)")),this.$o=this.ui.enqueueAfterDelay(this.timerId,r,()=>(this.Uo=Date.now(),e())),this.Ko*=this.qo,this.Ko<this.ko&&(this.Ko=this.ko),this.Ko>this.Qo&&(this.Ko=this.Qo)}jo(){null!==this.$o&&(this.$o.skipDelay(),this.$o=null)}cancel(){null!==this.$o&&(this.$o.cancel(),this.$o=null)}zo(){return(Math.random()-.5)*this.Ko}constructor(e,t,n=1e3,r=1.5,i=6e4){this.ui=e,this.timerId=t,this.ko=n,this.qo=r,this.Qo=i,this.Ko=0,this.$o=null,this.Uo=Date.now(),this.reset()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class n7{n_(){return 1===this.state||5===this.state||this.r_()}r_(){return 2===this.state||3===this.state}start(){this.e_=0,4!==this.state?this.auth():this.i_()}async stop(){this.n_()&&await this.close(0)}s_(){this.state=0,this.t_.reset()}o_(){this.r_()&&null===this.Zo&&(this.Zo=this.ui.enqueueAfterDelay(this.Ho,6e4,()=>this.__()))}a_(e){this.u_(),this.stream.send(e)}async __(){if(this.r_())return this.close(0)}u_(){this.Zo&&(this.Zo.cancel(),this.Zo=null)}c_(){this.Xo&&(this.Xo.cancel(),this.Xo=null)}async close(e,t){this.u_(),this.c_(),this.t_.cancel(),this.Yo++,4!==e?this.t_.reset():t&&t.code===C.RESOURCE_EXHAUSTED?(_(t.toString()),_("Using maximum backoff delay to prevent overloading the backend."),this.t_.Wo()):t&&t.code===C.UNAUTHENTICATED&&3!==this.state&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),null!==this.stream&&(this.l_(),this.stream.close(),this.stream=null),this.state=e,await this.listener.mo(t)}l_(){}auth(){this.state=1;let e=this.h_(this.Yo),t=this.Yo;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then(e=>{let[n,r]=e;this.Yo===t&&this.P_(n,r)},t=>{e(()=>{let e=new A(C.UNKNOWN,"Fetching auth token failed: "+t.message);return this.I_(e)})})}P_(e,t){let n=this.h_(this.Yo);this.stream=this.T_(e,t),this.stream.Eo(()=>{n(()=>this.listener.Eo())}),this.stream.Ro(()=>{n(()=>(this.state=2,this.Xo=this.ui.enqueueAfterDelay(this.Jo,1e4,()=>(this.r_()&&(this.state=3),Promise.resolve())),this.listener.Ro()))}),this.stream.mo(e=>{n(()=>this.I_(e))}),this.stream.onMessage(e=>{n(()=>1==++this.e_?this.E_(e):this.onNext(e))})}i_(){this.state=5,this.t_.Go(async()=>{this.state=0,this.start()})}I_(e){return w("PersistentStream","close with error: ".concat(e)),this.stream=null,this.close(4,e)}h_(e){return t=>{this.ui.enqueueAndForget(()=>this.Yo===e?t():(w("PersistentStream","stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve()))}}constructor(e,t,n,r,i,s,a,o){this.ui=e,this.Ho=n,this.Jo=r,this.connection=i,this.authCredentialsProvider=s,this.appCheckCredentialsProvider=a,this.listener=o,this.state=0,this.Yo=0,this.Zo=null,this.Xo=null,this.stream=null,this.e_=0,this.t_=new n6(e,t)}}class re extends n7{T_(e,t){return this.connection.Bo("Listen",e,t)}E_(e){return this.onNext(e)}onNext(e){this.t_.reset();let t=function(e,t){let n;if("targetChange"in t){var r,i;t.targetChange;let s="NO_CHANGE"===(r=t.targetChange.targetChangeType||"NO_CHANGE")?0:"ADD"===r?1:"REMOVE"===r?2:"CURRENT"===r?3:"RESET"===r?4:I(),a=t.targetChange.targetIds||[],o=(i=t.targetChange.resumeToken,e.useProto3Json?(void 0===i||"string"==typeof i||I(),eu.fromBase64String(i||"")):(void 0===i||i instanceof f||i instanceof Uint8Array||I(),eu.fromUint8Array(i||new Uint8Array))),l=t.targetChange.cause;n=new t9(s,a,o,l&&new A(void 0===l.code?C.UNKNOWN:tY(l.code),l.message||"")||null)}else if("documentChange"in t){t.documentChange;let r=t.documentChange;r.document,r.document.name,r.document.updateTime;let i=nd(e,r.document.name),s=no(r.document.updateTime),a=r.document.createTime?no(r.document.createTime):U.min(),o=new eO({mapValue:{fields:r.document.fields}}),l=eF.newFoundDocument(i,s,a,o);n=new t3(r.targetIds||[],r.removedTargetIds||[],l.key,l)}else if("documentDelete"in t){t.documentDelete;let r=t.documentDelete;r.document;let i=nd(e,r.document),s=r.readTime?no(r.readTime):U.min(),a=eF.newNoDocument(i,s);n=new t3([],r.removedTargetIds||[],a.key,a)}else if("documentRemove"in t){t.documentRemove;let r=t.documentRemove;r.document;let i=nd(e,r.document);n=new t3([],r.removedTargetIds||[],i,null)}else{if(!("filter"in t))return I();{t.filter;let e=t.filter;e.targetId;let{count:r=0,unchangedNames:i}=e,s=new tH(r,i);n=new t4(e.targetId,s)}}return n}(this.serializer,e),n=function(e){if(!("targetChange"in e))return U.min();let t=e.targetChange;return t.targetIds&&t.targetIds.length?U.min():t.readTime?no(t.readTime):U.min()}(e);return this.listener.d_(t,n)}A_(e){let t={};t.database=nm(this.serializer),t.addTarget=function(e,t){let n;let r=t.target;if((n=e9(r)?{documents:{documents:[nf(e,r.path)]}}:{query:function(e,t){var n,r;let i;let s={structuredQuery:{}},a=t.path;null!==t.collectionGroup?(i=a,s.structuredQuery.from=[{collectionId:t.collectionGroup,allDescendants:!0}]):(i=a.popLast(),s.structuredQuery.from=[{collectionId:a.lastSegment()}]),s.parent=nf(e,i);let o=function(e){if(0!==e.length)return function e(t){return t instanceof eK?function(e){if("=="===e.op){if(eR(e.value))return{unaryFilter:{field:ny(e.field),op:"IS_NAN"}};if(eD(e.value))return{unaryFilter:{field:ny(e.field),op:"IS_NULL"}}}else if("!="===e.op){if(eR(e.value))return{unaryFilter:{field:ny(e.field),op:"IS_NOT_NAN"}};if(eD(e.value))return{unaryFilter:{field:ny(e.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:ny(e.field),op:nt[e.op],value:e.value}}}(t):t instanceof eQ?function(t){let n=t.getFilters().map(t=>e(t));return 1===n.length?n[0]:{compositeFilter:{op:nn[t.op],filters:n}}}(t):I()}(eQ.create(e,"and"))}(t.filters);o&&(s.structuredQuery.where=o);let l=function(e){if(0!==e.length)return e.map(e=>({field:ny(e.field),direction:ne[e.dir]}))}(t.orderBy);l&&(s.structuredQuery.orderBy=l);let u=ni(e,t.limit);return null!==u&&(s.structuredQuery.limit=u),t.startAt&&(s.structuredQuery.startAt={before:(n=t.startAt).inclusive,values:n.position}),t.endAt&&(s.structuredQuery.endAt={before:!(r=t.endAt).inclusive,values:r.position}),{_t:s,parent:i}}(e,r)._t}).targetId=t.targetId,t.resumeToken.approximateByteSize()>0){n.resumeToken=na(e,t.resumeToken);let r=ni(e,t.expectedCount);null!==r&&(n.expectedCount=r)}else if(t.snapshotVersion.compareTo(U.min())>0){n.readTime=ns(e,t.snapshotVersion.toTimestamp());let r=ni(e,t.expectedCount);null!==r&&(n.expectedCount=r)}return n}(this.serializer,e);let n=function(e,t){let n=function(e){switch(e){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return I()}}(t.purpose);return null==n?null:{"goog-listen-tags":n}}(this.serializer,e);n&&(t.labels=n),this.a_(t)}R_(e){let t={};t.database=nm(this.serializer),t.removeTarget=e,this.a_(t)}constructor(e,t,n,r,i,s){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",t,n,r,s),this.serializer=i}}class rt extends n7{get V_(){return this.e_>0}start(){this.lastStreamToken=void 0,super.start()}l_(){this.V_&&this.m_([])}T_(e,t){return this.connection.Bo("Write",e,t)}E_(e){return e.streamToken||I(),this.lastStreamToken=e.streamToken,e.writeResults&&0!==e.writeResults.length&&I(),this.listener.f_()}onNext(e){var t,n;e.streamToken||I(),this.lastStreamToken=e.streamToken,this.t_.reset();let r=(t=e.writeResults,n=e.commitTime,t&&t.length>0?(void 0!==n||I(),t.map(e=>{let t;return(t=e.updateTime?no(e.updateTime):no(n)).isEqual(U.min())&&(t=no(n)),new tR(t,e.transformResults||[])})):[]),i=no(e.commitTime);return this.listener.g_(i,r)}p_(){let e={};e.database=nm(this.serializer),this.a_(e)}m_(e){let t={streamToken:this.lastStreamToken,writes:e.map(e=>(function(e,t){var n;let r;if(t instanceof tP)r={update:np(e,t.key,t.value)};else if(t instanceof tK)r={delete:nh(e,t.key)};else if(t instanceof tU)r={update:np(e,t.key,t.data),updateMask:function(e){let t=[];return e.fields.forEach(e=>t.push(e.canonicalString())),{fieldPaths:t}}(t.fieldMask)};else{if(!(t instanceof tQ))return I();r={verify:nh(e,t.key)}}return t.fieldTransforms.length>0&&(r.updateTransforms=t.fieldTransforms.map(e=>(function(e,t){let n=t.transform;if(n instanceof tT)return{fieldPath:t.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(n instanceof tI)return{fieldPath:t.field.canonicalString(),appendMissingElements:{values:n.elements}};if(n instanceof tA)return{fieldPath:t.field.canonicalString(),removeAllFromArray:{values:n.elements}};if(n instanceof tN)return{fieldPath:t.field.canonicalString(),increment:n.Pe};throw I()})(0,e))),t.precondition.isNone||(r.currentDocument=void 0!==(n=t.precondition).updateTime?{updateTime:ns(e,n.updateTime.toTimestamp())}:void 0!==n.exists?{exists:n.exists}:I()),r})(this.serializer,e))};this.a_(t)}constructor(e,t,n,r,i,s){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",t,n,r,s),this.serializer=i}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rn extends class{}{w_(){if(this.y_)throw new A(C.FAILED_PRECONDITION,"The client has already been terminated.")}Mo(e,t,n,r){return this.w_(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(i=>{let[s,a]=i;return this.connection.Mo(e,nu(t,n),r,s,a)}).catch(e=>{throw"FirebaseError"===e.name?(e.code===C.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),e):new A(C.UNKNOWN,e.toString())})}Lo(e,t,n,r,i){return this.w_(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(s=>{let[a,o]=s;return this.connection.Lo(e,nu(t,n),r,a,o,i)}).catch(e=>{throw"FirebaseError"===e.name?(e.code===C.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),e):new A(C.UNKNOWN,e.toString())})}terminate(){this.y_=!0,this.connection.terminate()}constructor(e,t,n,r){super(),this.authCredentials=e,this.appCheckCredentials=t,this.connection=n,this.serializer=r,this.y_=!1}}class rr{v_(){0===this.S_&&(this.C_("Unknown"),this.b_=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,()=>(this.b_=null,this.F_("Backend didn't respond within 10 seconds."),this.C_("Offline"),Promise.resolve())))}M_(e){"Online"===this.state?this.C_("Unknown"):(this.S_++,this.S_>=1&&(this.x_(),this.F_("Connection failed 1 times. Most recent error: ".concat(e.toString())),this.C_("Offline")))}set(e){this.x_(),this.S_=0,"Online"===e&&(this.D_=!1),this.C_(e)}C_(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}F_(e){let t="Could not reach Cloud Firestore backend. ".concat(e,"\nThis typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.");this.D_?(_(t),this.D_=!1):w("OnlineStateTracker",t)}x_(){null!==this.b_&&(this.b_.cancel(),this.b_=null)}constructor(e,t){this.asyncQueue=e,this.onlineStateHandler=t,this.state="Unknown",this.S_=0,this.b_=null,this.D_=!0}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ri{constructor(e,t,n,r,i){this.localStore=e,this.datastore=t,this.asyncQueue=n,this.remoteSyncer={},this.O_=[],this.N_=new Map,this.L_=new Set,this.B_=[],this.k_=i,this.k_._o(e=>{n.enqueueAndForget(async()=>{rf(this)&&(w("RemoteStore","Restarting streams for network reachability change."),await async function(e){e.L_.add(4),await ra(e),e.q_.set("Unknown"),e.L_.delete(4),await rs(e)}(this))})}),this.q_=new rr(n,r)}}async function rs(e){if(rf(e))for(let t of e.B_)await t(!0)}async function ra(e){for(let t of e.B_)await t(!1)}function ro(e,t){e.N_.has(t.targetId)||(e.N_.set(t.targetId,t),rd(e)?rh(e):rb(e).r_()&&ru(e,t))}function rl(e,t){let n=rb(e);e.N_.delete(t),n.r_()&&rc(e,t),0===e.N_.size&&(n.r_()?n.o_():rf(e)&&e.q_.set("Unknown"))}function ru(e,t){if(e.Q_.xe(t.targetId),t.resumeToken.approximateByteSize()>0||t.snapshotVersion.compareTo(U.min())>0){let n=e.remoteSyncer.getRemoteKeysForTarget(t.targetId).size;t=t.withExpectedCount(n)}rb(e).A_(t)}function rc(e,t){e.Q_.xe(t),rb(e).R_(t)}function rh(e){e.Q_=new t5({getRemoteKeysForTarget:t=>e.remoteSyncer.getRemoteKeysForTarget(t),ot:t=>e.N_.get(t)||null,tt:()=>e.datastore.serializer.databaseId}),rb(e).start(),e.q_.v_()}function rd(e){return rf(e)&&!rb(e).n_()&&e.N_.size>0}function rf(e){return 0===e.L_.size}async function rm(e){e.q_.set("Online")}async function rg(e){e.N_.forEach((t,n)=>{ru(e,t)})}async function rp(e,t){e.Q_=void 0,rd(e)?(e.q_.M_(t),rh(e)):e.q_.set("Unknown")}async function ry(e,t,n){if(e.q_.set("Online"),t instanceof t9&&2===t.state&&t.cause)try{await async function(e,t){let n=t.cause;for(let r of t.targetIds)e.N_.has(r)&&(await e.remoteSyncer.rejectListen(r,n),e.N_.delete(r),e.Q_.removeTarget(r))}(e,t)}catch(n){w("RemoteStore","Failed to remove targets %s: %s ",t.targetIds.join(","),n),await rv(e,n)}else if(t instanceof t3?e.Q_.Ke(t):t instanceof t4?e.Q_.He(t):e.Q_.We(t),!n.isEqual(U.min()))try{let t=await nW(e.localStore);n.compareTo(t)>=0&&await function(e,t){let n=e.Q_.rt(t);return n.targetChanges.forEach((n,r)=>{if(n.resumeToken.approximateByteSize()>0){let i=e.N_.get(r);i&&e.N_.set(r,i.withResumeToken(n.resumeToken,t))}}),n.targetMismatches.forEach((t,n)=>{let r=e.N_.get(t);if(!r)return;e.N_.set(t,r.withResumeToken(eu.EMPTY_BYTE_STRING,r.snapshotVersion)),rc(e,t);let i=new n_(r.target,t,n,r.sequenceNumber);ru(e,i)}),e.remoteSyncer.applyRemoteEvent(n)}(e,n)}catch(t){w("RemoteStore","Failed to raise snapshot:",t),await rv(e,t)}}async function rv(e,t,n){if(!X(t))throw t;e.L_.add(1),await ra(e),e.q_.set("Offline"),n||(n=()=>nW(e.localStore)),e.asyncQueue.enqueueRetryable(async()=>{w("RemoteStore","Retrying IndexedDB access"),await n(),e.L_.delete(1),await rs(e)})}function rw(e,t){return t().catch(n=>rv(e,n,t))}async function r_(e){let t=rD(e),n=e.O_.length>0?e.O_[e.O_.length-1].batchId:-1;for(;rf(e)&&e.O_.length<10;)try{let r=await function(e,t){return e.persistence.runTransaction("Get next mutation batch","readonly",n=>(void 0===t&&(t=-1),e.mutationQueue.getNextMutationBatchAfterBatchId(n,t)))}(e.localStore,n);if(null===r){0===e.O_.length&&t.o_();break}n=r.batchId,function(e,t){e.O_.push(t);let n=rD(e);n.r_()&&n.V_&&n.m_(t.mutations)}(e,r)}catch(t){await rv(e,t)}rE(e)&&rT(e)}function rE(e){return rf(e)&&!rD(e).n_()&&e.O_.length>0}function rT(e){rD(e).start()}async function rI(e){rD(e).p_()}async function rC(e){let t=rD(e);for(let n of e.O_)t.m_(n.mutations)}async function rA(e,t,n){let r=e.O_.shift(),i=tj.from(r,t,n);await rw(e,()=>e.remoteSyncer.applySuccessfulWrite(i)),await r_(e)}async function rS(e,t){t&&rD(e).V_&&await async function(e,t){var n;if(function(e){switch(e){default:return I();case C.CANCELLED:case C.UNKNOWN:case C.DEADLINE_EXCEEDED:case C.RESOURCE_EXHAUSTED:case C.INTERNAL:case C.UNAVAILABLE:case C.UNAUTHENTICATED:return!1;case C.INVALID_ARGUMENT:case C.NOT_FOUND:case C.ALREADY_EXISTS:case C.PERMISSION_DENIED:case C.FAILED_PRECONDITION:case C.ABORTED:case C.OUT_OF_RANGE:case C.UNIMPLEMENTED:case C.DATA_LOSS:return!0}}(n=t.code)&&n!==C.ABORTED){let n=e.O_.shift();rD(e).s_(),await rw(e,()=>e.remoteSyncer.rejectFailedWrite(n.batchId,t)),await r_(e)}}(e,t),rE(e)&&rT(e)}async function rN(e,t){e.asyncQueue.verifyOperationInProgress(),w("RemoteStore","RemoteStore received new credentials");let n=rf(e);e.L_.add(3),await ra(e),n&&e.q_.set("Unknown"),await e.remoteSyncer.handleCredentialChange(t),e.L_.delete(3),await rs(e)}async function rk(e,t){t?(e.L_.delete(2),await rs(e)):t||(e.L_.add(2),await ra(e),e.q_.set("Unknown"))}function rb(e){var t,n,r;return e.K_||(e.K_=(t=e.datastore,n=e.asyncQueue,r={Eo:rm.bind(null,e),Ro:rg.bind(null,e),mo:rp.bind(null,e),d_:ry.bind(null,e)},t.w_(),new re(n,t.connection,t.authCredentials,t.appCheckCredentials,t.serializer,r)),e.B_.push(async t=>{t?(e.K_.s_(),rd(e)?rh(e):e.q_.set("Unknown")):(await e.K_.stop(),e.Q_=void 0)})),e.K_}function rD(e){var t,n,r;return e.U_||(e.U_=(t=e.datastore,n=e.asyncQueue,r={Eo:()=>Promise.resolve(),Ro:rI.bind(null,e),mo:rS.bind(null,e),f_:rC.bind(null,e),g_:rA.bind(null,e)},t.w_(),new rt(n,t.connection,t.authCredentials,t.appCheckCredentials,t.serializer,r)),e.B_.push(async t=>{t?(e.U_.s_(),await r_(e)):(await e.U_.stop(),e.O_.length>0&&(w("RemoteStore","Stopping write stream with ".concat(e.O_.length," pending writes")),e.O_=[]))})),e.U_}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rR{get promise(){return this.deferred.promise}static createAndSchedule(e,t,n,r,i){let s=new rR(e,t,Date.now()+n,r,i);return s.start(n),s}start(e){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){null!==this.timerHandle&&(this.clearTimeout(),this.deferred.reject(new A(C.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>null!==this.timerHandle?(this.clearTimeout(),this.op().then(e=>this.deferred.resolve(e))):Promise.resolve())}clearTimeout(){null!==this.timerHandle&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}constructor(e,t,n,r,i){this.asyncQueue=e,this.timerId=t,this.targetTimeMs=n,this.op=r,this.removalCallback=i,this.deferred=new S,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(e=>{})}}function rx(e,t){if(_("AsyncQueue","".concat(t,": ").concat(e)),X(e))return new A(C.UNAVAILABLE,"".concat(t,": ").concat(e));throw e}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rL{static emptySet(e){return new rL(e.comparator)}has(e){return null!=this.keyedMap.get(e)}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){let t=this.keyedMap.get(e);return t?this.sortedSet.indexOf(t):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal((t,n)=>(e(t),!1))}add(e){let t=this.delete(e.key);return t.copy(t.keyedMap.insert(e.key,e),t.sortedSet.insert(e,null))}delete(e){let t=this.get(e);return t?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(t)):this}isEqual(e){if(!(e instanceof rL)||this.size!==e.size)return!1;let t=this.sortedSet.getIterator(),n=e.sortedSet.getIterator();for(;t.hasNext();){let e=t.getNext().key,r=n.getNext().key;if(!e.isEqual(r))return!1}return!0}toString(){let e=[];return this.forEach(t=>{e.push(t.toString())}),0===e.length?"DocumentSet ()":"DocumentSet (\n  "+e.join("  \n")+"\n)"}copy(e,t){let n=new rL;return n.comparator=this.comparator,n.keyedMap=e,n.sortedSet=t,n}constructor(e){this.comparator=e?(t,n)=>e(t,n)||Q.comparator(t.key,n.key):(e,t)=>Q.comparator(e.key,t.key),this.keyedMap=th(),this.sortedSet=new en(this.comparator)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rV{track(e){let t=e.doc.key,n=this.W_.get(t);n?0!==e.type&&3===n.type?this.W_=this.W_.insert(t,e):3===e.type&&1!==n.type?this.W_=this.W_.insert(t,{type:n.type,doc:e.doc}):2===e.type&&2===n.type?this.W_=this.W_.insert(t,{type:2,doc:e.doc}):2===e.type&&0===n.type?this.W_=this.W_.insert(t,{type:0,doc:e.doc}):1===e.type&&0===n.type?this.W_=this.W_.remove(t):1===e.type&&2===n.type?this.W_=this.W_.insert(t,{type:1,doc:n.doc}):0===e.type&&1===n.type?this.W_=this.W_.insert(t,{type:2,doc:e.doc}):I():this.W_=this.W_.insert(t,e)}G_(){let e=[];return this.W_.inorderTraversal((t,n)=>{e.push(n)}),e}constructor(){this.W_=new en(Q.comparator)}}class rM{static fromInitialDocuments(e,t,n,r,i){let s=[];return t.forEach(e=>{s.push({type:0,doc:e})}),new rM(e,t,rL.emptySet(t),s,n,r,!0,!1,i)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&tr(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;let t=this.docChanges,n=e.docChanges;if(t.length!==n.length)return!1;for(let e=0;e<t.length;e++)if(t[e].type!==n[e].type||!t[e].doc.isEqual(n[e].doc))return!1;return!0}constructor(e,t,n,r,i,s,a,o,l){this.query=e,this.docs=t,this.oldDocs=n,this.docChanges=r,this.mutatedKeys=i,this.fromCache=s,this.syncStateChanged=a,this.excludesMetadataChanges=o,this.hasCachedResults=l}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rO{H_(){return this.j_.some(e=>e.J_())}constructor(){this.z_=void 0,this.j_=[]}}class rF{terminate(){!function(e,t){let n=e.queries;e.queries=rP(),n.forEach((e,n)=>{for(let e of n.j_)e.onError(t)})}(this,new A(C.ABORTED,"Firestore shutting down"))}constructor(){this.queries=rP(),this.onlineState="Unknown",this.Y_=new Set}}function rP(){return new tl(e=>ti(e),tr)}async function rU(e,t){let n=3,r=t.query,i=e.queries.get(r);i?!i.H_()&&t.J_()&&(n=2):(i=new rO,n=t.J_()?0:1);try{switch(n){case 0:i.z_=await e.onListen(r,!0);break;case 1:i.z_=await e.onListen(r,!1);break;case 2:await e.onFirstRemoteStoreListen(r)}}catch(n){let e=rx(n,"Initialization of query '".concat(ts(t.query),"' failed"));return void t.onError(e)}e.queries.set(r,i),i.j_.push(t),t.Z_(e.onlineState),i.z_&&t.X_(i.z_)&&rK(e)}async function rq(e,t){let n=t.query,r=3,i=e.queries.get(n);if(i){let e=i.j_.indexOf(t);e>=0&&(i.j_.splice(e,1),0===i.j_.length?r=t.J_()?0:1:!i.H_()&&t.J_()&&(r=2))}switch(r){case 0:return e.queries.delete(n),e.onUnlisten(n,!0);case 1:return e.queries.delete(n),e.onUnlisten(n,!1);case 2:return e.onLastRemoteStoreUnlisten(n);default:return}}function rB(e,t){let n=!1;for(let r of t){let t=r.query,i=e.queries.get(t);if(i){for(let e of i.j_)e.X_(r)&&(n=!0);i.z_=r}}n&&rK(e)}function rz(e,t,n){let r=e.queries.get(t);if(r)for(let e of r.j_)e.onError(n);e.queries.delete(t)}function rK(e){e.Y_.forEach(e=>{e.next()})}(a=s||(s={})).ea="default",a.Cache="cache";class rQ{X_(e){if(!this.options.includeMetadataChanges){let t=[];for(let n of e.docChanges)3!==n.type&&t.push(n);e=new rM(e.query,e.docs,e.oldDocs,t,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let t=!1;return this.na?this.ia(e)&&(this.ta.next(e),t=!0):this.sa(e,this.onlineState)&&(this.oa(e),t=!0),this.ra=e,t}onError(e){this.ta.error(e)}Z_(e){this.onlineState=e;let t=!1;return this.ra&&!this.na&&this.sa(this.ra,e)&&(this.oa(this.ra),t=!0),t}sa(e,t){return!(e.fromCache&&this.J_())||(!this.options._a||!("Offline"!==t))&&(!e.docs.isEmpty()||e.hasCachedResults||"Offline"===t)}ia(e){if(e.docChanges.length>0)return!0;let t=this.ra&&this.ra.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!t)&&!0===this.options.includeMetadataChanges}oa(e){e=rM.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.na=!0,this.ta.next(e)}J_(){return this.options.source!==s.Cache}constructor(e,t,n){this.query=e,this.ta=t,this.na=!1,this.ra=null,this.onlineState="Unknown",this.options=n||{}}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rG{constructor(e){this.key=e}}class rj{constructor(e){this.key=e}}class rW{get Va(){return this.Ta}ma(e,t){let n=t?t.fa:new rV,r=t?t.Ra:this.Ra,i=t?t.mutatedKeys:this.mutatedKeys,s=r,a=!1,o="F"===this.query.limitType&&r.size===this.query.limit?r.last():null,l="L"===this.query.limitType&&r.size===this.query.limit?r.first():null;if(e.inorderTraversal((e,t)=>{let u=r.get(e),c=ta(this.query,t)?t:null,h=!!u&&this.mutatedKeys.has(u.key),d=!!c&&(c.hasLocalMutations||this.mutatedKeys.has(c.key)&&c.hasCommittedMutations),f=!1;u&&c?u.data.isEqual(c.data)?h!==d&&(n.track({type:3,doc:c}),f=!0):this.ga(u,c)||(n.track({type:2,doc:c}),f=!0,(o&&this.Aa(c,o)>0||l&&0>this.Aa(c,l))&&(a=!0)):!u&&c?(n.track({type:0,doc:c}),f=!0):u&&!c&&(n.track({type:1,doc:u}),f=!0,(o||l)&&(a=!0)),f&&(c?(s=s.add(c),i=d?i.add(e):i.delete(e)):(s=s.delete(e),i=i.delete(e)))}),null!==this.query.limit)for(;s.size>this.query.limit;){let e="F"===this.query.limitType?s.last():s.first();s=s.delete(e.key),i=i.delete(e.key),n.track({type:1,doc:e})}return{Ra:s,fa:n,ns:a,mutatedKeys:i}}ga(e,t){return e.hasLocalMutations&&t.hasCommittedMutations&&!t.hasLocalMutations}applyChanges(e,t,n,r){let i=this.Ra;this.Ra=e.Ra,this.mutatedKeys=e.mutatedKeys;let s=e.fa.G_();s.sort((e,t)=>(function(e,t){let n=e=>{switch(e){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return I()}};return n(e)-n(t)})(e.type,t.type)||this.Aa(e.doc,t.doc)),this.pa(n),r=null!=r&&r;let a=t&&!r?this.ya():[],o=0===this.da.size&&this.current&&!r?1:0,l=o!==this.Ea;return(this.Ea=o,0!==s.length||l)?{snapshot:new rM(this.query,e.Ra,i,s,e.mutatedKeys,0===o,l,!1,!!n&&n.resumeToken.approximateByteSize()>0),wa:a}:{wa:a}}Z_(e){return this.current&&"Offline"===e?(this.current=!1,this.applyChanges({Ra:this.Ra,fa:new rV,mutatedKeys:this.mutatedKeys,ns:!1},!1)):{wa:[]}}Sa(e){return!this.Ta.has(e)&&!!this.Ra.has(e)&&!this.Ra.get(e).hasLocalMutations}pa(e){e&&(e.addedDocuments.forEach(e=>this.Ta=this.Ta.add(e)),e.modifiedDocuments.forEach(e=>{}),e.removedDocuments.forEach(e=>this.Ta=this.Ta.delete(e)),this.current=e.current)}ya(){if(!this.current)return[];let e=this.da;this.da=tp(),this.Ra.forEach(e=>{this.Sa(e.key)&&(this.da=this.da.add(e.key))});let t=[];return e.forEach(e=>{this.da.has(e)||t.push(new rj(e))}),this.da.forEach(n=>{e.has(n)||t.push(new rG(n))}),t}ba(e){this.Ta=e.Ts,this.da=tp();let t=this.ma(e.documents);return this.applyChanges(t,!0)}Da(){return rM.fromInitialDocuments(this.query,this.Ra,this.mutatedKeys,0===this.Ea,this.hasCachedResults)}constructor(e,t){this.query=e,this.Ta=t,this.Ea=null,this.hasCachedResults=!1,this.current=!1,this.da=tp(),this.mutatedKeys=tp(),this.Aa=to(e),this.Ra=new rL(this.Aa)}}class rH{constructor(e,t,n){this.query=e,this.targetId=t,this.view=n}}class rY{constructor(e){this.key=e,this.va=!1}}class rX{get isPrimaryClient(){return!0===this.Qa}constructor(e,t,n,r,i,s){this.localStore=e,this.remoteStore=t,this.eventManager=n,this.sharedClientState=r,this.currentUser=i,this.maxConcurrentLimboResolutions=s,this.Ca={},this.Fa=new tl(e=>ti(e),tr),this.Ma=new Map,this.xa=new Set,this.Oa=new en(Q.comparator),this.Na=new Map,this.La=new nL,this.Ba={},this.ka=new Map,this.qa=nS.kn(),this.onlineState="Unknown",this.Qa=void 0}}async function rJ(e,t){let n,r=!(arguments.length>2)||void 0===arguments[2]||arguments[2],i=iu(e),s=i.Fa.get(t);return s?(i.sharedClientState.addLocalQueryTarget(s.targetId),n=s.view.Da()):n=await r$(i,t,r,!0),n}async function rZ(e,t){let n=iu(e);await r$(n,t,!0,!1)}async function r$(e,t,n,r){var i,s;let a;let o=await (i=e.localStore,s=te(t),i.persistence.runTransaction("Allocate target","readwrite",e=>{let t;return i.Ur.getTargetData(e,s).next(n=>n?(t=n,Y.resolve(t)):i.Ur.allocateTargetId(e).next(n=>(t=new n_(s,n,"TargetPurposeListen",e.currentSequenceNumber),i.Ur.addTargetData(e,t).next(()=>t))))}).then(e=>{let t=i.os.get(e.targetId);return(null===t||e.snapshotVersion.compareTo(t.snapshotVersion)>0)&&(i.os=i.os.insert(e.targetId,e),i._s.set(s,e.targetId)),e})),l=o.targetId,u=e.sharedClientState.addLocalQueryTarget(l,n);return r&&(a=await r0(e,t,l,"current"===u,o.resumeToken)),e.isPrimaryClient&&n&&ro(e.remoteStore,o),a}async function r0(e,t,n,r,i){e.Ka=(t,n,r)=>(async function(e,t,n,r){let i=t.view.ma(n);i.ns&&(i=await nY(e.localStore,t.query,!1).then(e=>{let{documents:n}=e;return t.view.ma(n,i)}));let s=r&&r.targetChanges.get(t.targetId),a=r&&null!=r.targetMismatches.get(t.targetId),o=t.view.applyChanges(i,e.isPrimaryClient,s,a);return ii(e,t.targetId,o.wa),o.snapshot})(e,t,n,r);let s=await nY(e.localStore,t,!0),a=new rW(t,s.Ts),o=a.ma(s.documents),l=t2.createSynthesizedTargetChangeForCurrentChange(n,r&&"Offline"!==e.onlineState,i),u=a.applyChanges(o,e.isPrimaryClient,l);ii(e,n,u.wa);let c=new rH(t,n,a);return e.Fa.set(t,c),e.Ma.has(n)?e.Ma.get(n).push(t):e.Ma.set(n,[t]),u.snapshot}async function r1(e,t,n){let r=e.Fa.get(t),i=e.Ma.get(r.targetId);if(i.length>1)return e.Ma.set(r.targetId,i.filter(e=>!tr(e,t))),void e.Fa.delete(t);e.isPrimaryClient?(e.sharedClientState.removeLocalQueryTarget(r.targetId),e.sharedClientState.isActiveQueryTarget(r.targetId)||await nH(e.localStore,r.targetId,!1).then(()=>{e.sharedClientState.clearQueryState(r.targetId),n&&rl(e.remoteStore,r.targetId),it(e,r.targetId)}).catch(H)):(it(e,r.targetId),await nH(e.localStore,r.targetId,!0))}async function r2(e,t){let n=e.Fa.get(t),r=e.Ma.get(n.targetId);e.isPrimaryClient&&1===r.length&&(e.sharedClientState.removeLocalQueryTarget(n.targetId),rl(e.remoteStore,n.targetId))}async function r3(e,t,n){var r;let i=(e.remoteStore.remoteSyncer.applySuccessfulWrite=r5.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=r6.bind(null,e),e);try{let e;let s=await function(e,t){let n,r;let i=P.now(),s=t.reduce((e,t)=>e.add(t.key),tp());return e.persistence.runTransaction("Locally write mutations","readwrite",a=>{let o=tu,l=tp();return e.cs.getEntries(a,s).next(e=>{(o=e).forEach((e,t)=>{t.isValidDocument()||(l=l.add(e))})}).next(()=>e.localDocuments.getOverlayedDocuments(a,o)).next(r=>{n=r;let s=[];for(let e of t){let t=function(e,t){let n=null;for(let r of e.fieldTransforms){let e=t.data.field(r.field),i=tE(r.transform,e||null);null!=i&&(null===n&&(n=eO.empty()),n.set(r.field,i))}return n||null}(e,n.get(e.key).overlayedDocument);null!=t&&s.push(new tU(e.key,t,function e(t){let n=[];return ee(t.fields,(t,r)=>{let i=new K([t]);if(ex(r)){let t=e(r.mapValue).fields;if(0===t.length)n.push(i);else for(let e of t)n.push(i.child(e))}else n.push(i)}),new eo(n)}(t.value.mapValue),tx.exists(!0)))}return e.mutationQueue.addMutationBatch(a,i,s,t)}).next(t=>{r=t;let i=t.applyToLocalDocumentSet(n,l);return e.documentOverlayCache.saveOverlays(a,t.batchId,i)})}).then(()=>({batchId:r.batchId,changes:td(n)}))}(i.localStore,t);i.sharedClientState.addPendingMutation(s.batchId),r=s.batchId,(e=i.Ba[i.currentUser.toKey()])||(e=new en(O)),e=e.insert(r,n),i.Ba[i.currentUser.toKey()]=e,await ia(i,s.changes),await r_(i.remoteStore)}catch(t){let e=rx(t,"Failed to persist write");n.reject(e)}}async function r4(e,t){try{let n=await function(e,t){let n=t.snapshotVersion,r=e.os;return e.persistence.runTransaction("Apply remote event","readwrite-primary",i=>{var s;let a,o;let l=e.cs.newChangeBuffer({trackRemovals:!0});r=e.os;let u=[];t.targetChanges.forEach((s,a)=>{var o;let l=r.get(a);if(!l)return;u.push(e.Ur.removeMatchingKeys(i,s.removedDocuments,a).next(()=>e.Ur.addMatchingKeys(i,s.addedDocuments,a)));let c=l.withSequenceNumber(i.currentSequenceNumber);null!==t.targetMismatches.get(a)?c=c.withResumeToken(eu.EMPTY_BYTE_STRING,U.min()).withLastLimboFreeSnapshotVersion(U.min()):s.resumeToken.approximateByteSize()>0&&(c=c.withResumeToken(s.resumeToken,n)),r=r.insert(a,c),o=c,(0===l.resumeToken.approximateByteSize()||o.snapshotVersion.toMicroseconds()-l.snapshotVersion.toMicroseconds()>=3e8||s.addedDocuments.size+s.modifiedDocuments.size+s.removedDocuments.size>0)&&u.push(e.Ur.updateTargetData(i,c))});let c=tu,h=tp();if(t.documentUpdates.forEach(n=>{t.resolvedLimboDocuments.has(n)&&u.push(e.persistence.referenceDelegate.updateLimboDocument(i,n))}),u.push((s=t.documentUpdates,a=tp(),o=tp(),s.forEach(e=>a=a.add(e)),l.getEntries(i,a).next(e=>{let t=tu;return s.forEach((n,r)=>{let i=e.get(n);r.isFoundDocument()!==i.isFoundDocument()&&(o=o.add(n)),r.isNoDocument()&&r.version.isEqual(U.min())?(l.removeEntry(n,r.readTime),t=t.insert(n,r)):!i.isValidDocument()||r.version.compareTo(i.version)>0||0===r.version.compareTo(i.version)&&i.hasPendingWrites?(l.addEntry(r),t=t.insert(n,r)):w("LocalStore","Ignoring outdated watch update for ",n,". Current version:",i.version," Watch version:",r.version)}),{Ps:t,Is:o}})).next(e=>{c=e.Ps,h=e.Is})),!n.isEqual(U.min())){let t=e.Ur.getLastRemoteSnapshotVersion(i).next(t=>e.Ur.setTargetsMetadata(i,i.currentSequenceNumber,n));u.push(t)}return Y.waitFor(u).next(()=>l.apply(i)).next(()=>e.localDocuments.getLocalViewOfDocuments(i,c,h)).next(()=>c)}).then(t=>(e.os=r,t))}(e.localStore,t);t.targetChanges.forEach((t,n)=>{let r=e.Na.get(n);r&&(t.addedDocuments.size+t.modifiedDocuments.size+t.removedDocuments.size<=1||I(),t.addedDocuments.size>0?r.va=!0:t.modifiedDocuments.size>0?r.va||I():t.removedDocuments.size>0&&(r.va||I(),r.va=!1))}),await ia(e,n,t)}catch(e){await H(e)}}function r9(e,t,n){var r;if(e.isPrimaryClient&&0===n||!e.isPrimaryClient&&1===n){let n;let i=[];e.Fa.forEach((e,n)=>{let r=n.view.Z_(t);r.snapshot&&i.push(r.snapshot)}),(r=e.eventManager).onlineState=t,n=!1,r.queries.forEach((e,r)=>{for(let e of r.j_)e.Z_(t)&&(n=!0)}),n&&rK(r),i.length&&e.Ca.d_(i),e.onlineState=t,e.isPrimaryClient&&e.sharedClientState.setOnlineState(t)}}async function r8(e,t,n){e.sharedClientState.updateQueryState(t,"rejected",n);let r=e.Na.get(t),i=r&&r.key;if(i){let n=new en(Q.comparator);n=n.insert(i,eF.newNoDocument(i,U.min()));let r=tp().add(i),s=new t1(U.min(),new Map,new en(O),n,r);await r4(e,s),e.Oa=e.Oa.remove(i),e.Na.delete(t),is(e)}else await nH(e.localStore,t,!1).then(()=>it(e,t,n)).catch(H)}async function r5(e,t){var n;let r=t.batch.batchId;try{let i=await (n=e.localStore).persistence.runTransaction("Acknowledge batch","readwrite-primary",e=>{let r=t.batch.keys(),i=n.cs.newChangeBuffer({trackRemovals:!0});return(function(e,t,n,r){let i=n.batch,s=i.keys(),a=Y.resolve();return s.forEach(e=>{a=a.next(()=>r.getEntry(t,e)).next(t=>{let s=n.docVersions.get(e);null!==s||I(),0>t.version.compareTo(s)&&(i.applyToRemoteDocument(t,n),t.isValidDocument()&&(t.setReadTime(n.commitVersion),r.addEntry(t)))})}),a.next(()=>e.mutationQueue.removeMutationBatch(t,i))})(n,e,t,i).next(()=>i.apply(e)).next(()=>n.mutationQueue.performConsistencyCheck(e)).next(()=>n.documentOverlayCache.removeOverlaysForBatchId(e,r,t.batch.batchId)).next(()=>n.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(e,function(e){let t=tp();for(let n=0;n<e.mutationResults.length;++n)e.mutationResults[n].transformResults.length>0&&(t=t.add(e.batch.mutations[n].key));return t}(t))).next(()=>n.localDocuments.getDocuments(e,r))});ie(e,r,null),r7(e,r),e.sharedClientState.updateMutationState(r,"acknowledged"),await ia(e,i)}catch(e){await H(e)}}async function r6(e,t,n){var r;try{let i=await (r=e.localStore).persistence.runTransaction("Reject batch","readwrite-primary",e=>{let n;return r.mutationQueue.lookupMutationBatch(e,t).next(t=>(null!==t||I(),n=t.keys(),r.mutationQueue.removeMutationBatch(e,t))).next(()=>r.mutationQueue.performConsistencyCheck(e)).next(()=>r.documentOverlayCache.removeOverlaysForBatchId(e,n,t)).next(()=>r.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(e,n)).next(()=>r.localDocuments.getDocuments(e,n))});ie(e,t,n),r7(e,t),e.sharedClientState.updateMutationState(t,"rejected",n),await ia(e,i)}catch(e){await H(e)}}function r7(e,t){(e.ka.get(t)||[]).forEach(e=>{e.resolve()}),e.ka.delete(t)}function ie(e,t,n){let r=e.Ba[e.currentUser.toKey()];if(r){let i=r.get(t);i&&(n?i.reject(n):i.resolve(),r=r.remove(t)),e.Ba[e.currentUser.toKey()]=r}}function it(e,t){let n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:null;for(let r of(e.sharedClientState.removeLocalQueryTarget(t),e.Ma.get(t)))e.Fa.delete(r),n&&e.Ca.$a(r,n);e.Ma.delete(t),e.isPrimaryClient&&e.La.gr(t).forEach(t=>{e.La.containsKey(t)||ir(e,t)})}function ir(e,t){e.xa.delete(t.path.canonicalString());let n=e.Oa.get(t);null!==n&&(rl(e.remoteStore,n),e.Oa=e.Oa.remove(t),e.Na.delete(n),is(e))}function ii(e,t,n){for(let r of n)r instanceof rG?(e.La.addReference(r.key,t),function(e,t){let n=t.key,r=n.path.canonicalString();e.Oa.get(n)||e.xa.has(r)||(w("SyncEngine","New document in limbo: "+n),e.xa.add(r),is(e))}(e,r)):r instanceof rj?(w("SyncEngine","Document no longer in limbo: "+r.key),e.La.removeReference(r.key,t),e.La.containsKey(r.key)||ir(e,r.key)):I()}function is(e){for(;e.xa.size>0&&e.Oa.size<e.maxConcurrentLimboResolutions;){let t=e.xa.values().next().value;e.xa.delete(t);let n=new Q(B.fromString(t)),r=e.qa.next();e.Na.set(r,new rY(n)),e.Oa=e.Oa.insert(n,r),ro(e.remoteStore,new n_(te(new e8(n.path)),r,"TargetPurposeLimboResolution",J.oe))}}async function ia(e,t,n){let r=[],i=[],s=[];e.Fa.isEmpty()||(e.Fa.forEach((a,o)=>{s.push(e.Ka(o,t,n).then(t=>{var s;if((t||n)&&e.isPrimaryClient){let r=t?!t.fromCache:null===(s=null==n?void 0:n.targetChanges.get(o.targetId))||void 0===s?void 0:s.current;e.sharedClientState.updateQueryState(o.targetId,r?"current":"not-current")}if(t){r.push(t);let e=nz.Wi(o.targetId,t);i.push(e)}}))}),await Promise.all(s),e.Ca.d_(r),await async function(e,t){try{await e.persistence.runTransaction("notifyLocalViewChanges","readwrite",n=>Y.forEach(t,t=>Y.forEach(t.$i,r=>e.persistence.referenceDelegate.addReference(n,t.targetId,r)).next(()=>Y.forEach(t.Ui,r=>e.persistence.referenceDelegate.removeReference(n,t.targetId,r)))))}catch(e){if(!X(e))throw e;w("LocalStore","Failed to update sequence numbers: "+e)}for(let n of t){let t=n.targetId;if(!n.fromCache){let n=e.os.get(t),r=n.snapshotVersion,i=n.withLastLimboFreeSnapshotVersion(r);e.os=e.os.insert(t,i)}}}(e.localStore,i))}async function io(e,t){if(!e.currentUser.isEqual(t)){w("SyncEngine","User change. New user:",t.toKey());let n=await nj(e.localStore,t);e.currentUser=t,e.ka.forEach(e=>{e.forEach(e=>{e.reject(new A(C.CANCELLED,"'waitForPendingWrites' promise is rejected due to a user change."))})}),e.ka.clear(),e.sharedClientState.handleUserChange(t,n.removedBatchIds,n.addedBatchIds),await ia(e,n.hs)}}function il(e,t){let n=e.Na.get(t);if(n&&n.va)return tp().add(n.key);{let n=tp(),r=e.Ma.get(t);if(!r)return n;for(let t of r){let r=e.Fa.get(t);n=n.unionWith(r.view.Va)}return n}}function iu(e){return e.remoteStore.remoteSyncer.applyRemoteEvent=r4.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=il.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=r8.bind(null,e),e.Ca.d_=rB.bind(null,e.eventManager),e.Ca.$a=rz.bind(null,e.eventManager),e}class ic{async initialize(e){this.serializer=n5(e.databaseInfo.databaseId),this.sharedClientState=this.Wa(e),this.persistence=this.Ga(e),await this.persistence.start(),this.localStore=this.za(e),this.gcScheduler=this.ja(e,this.localStore),this.indexBackfillerScheduler=this.Ha(e,this.localStore)}ja(e,t){return null}Ha(e,t){return null}za(e){var t;return t=this.persistence,new nG(t,new nQ,e.initialUser,this.serializer)}Ga(e){return new nU(nB.Zr,this.serializer)}Wa(e){return new nJ}async terminate(){var e,t;null===(e=this.gcScheduler)||void 0===e||e.stop(),null===(t=this.indexBackfillerScheduler)||void 0===t||t.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}constructor(){this.kind="memory",this.synchronizeTabs=!1}}ic.provider={build:()=>new ic};class ih{async initialize(e,t){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(t),this.remoteStore=this.createRemoteStore(t),this.eventManager=this.createEventManager(t),this.syncEngine=this.createSyncEngine(t,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=e=>r9(this.syncEngine,e,1),this.remoteStore.remoteSyncer.handleCredentialChange=io.bind(null,this.syncEngine),await rk(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return new rF}createDatastore(e){let t=n5(e.databaseInfo.databaseId),n=new n9(e.databaseInfo);return new rn(e.authCredentials,e.appCheckCredentials,n,t)}createRemoteStore(e){var t;return t=this.localStore,new ri(t,this.datastore,e.asyncQueue,e=>r9(this.syncEngine,e,0),n$.D()?new n$:new nZ)}createSyncEngine(e,t){return function(e,t,n,r,i,s,a){let o=new rX(e,t,n,r,i,s);return a&&(o.Qa=!0),o}(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,t)}async terminate(){var e,t;await async function(e){w("RemoteStore","RemoteStore shutting down."),e.L_.add(5),await ra(e),e.k_.shutdown(),e.q_.set("Unknown")}(this.remoteStore),null===(e=this.datastore)||void 0===e||e.terminate(),null===(t=this.eventManager)||void 0===t||t.terminate()}}ih.provider={build:()=>new ih};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class id{next(e){this.muted||this.observer.next&&this.Ya(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.Ya(this.observer.error,e):_("Uncaught Error in snapshot listener:",e.toString()))}Za(){this.muted=!0}Ya(e,t){setTimeout(()=>{this.muted||e(t)},0)}constructor(e){this.observer=e,this.muted=!1}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class im{get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this.databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();let e=new S;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(n){let t=rx(n,"Failed to shutdown persistence");e.reject(t)}}),e.promise}constructor(e,t,n,r,i){this.authCredentials=e,this.appCheckCredentials=t,this.asyncQueue=n,this.databaseInfo=r,this.user=g.UNAUTHENTICATED,this.clientId=M.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=i,this.authCredentials.start(n,async e=>{w("FirestoreClient","Received user=",e.uid),await this.authCredentialListener(e),this.user=e}),this.appCheckCredentials.start(n,e=>(w("FirestoreClient","Received new app check token=",e),this.appCheckCredentialListener(e,this.user)))}}async function ig(e,t){e.asyncQueue.verifyOperationInProgress(),w("FirestoreClient","Initializing OfflineComponentProvider");let n=e.configuration;await t.initialize(n);let r=n.initialUser;e.setCredentialChangeListener(async e=>{r.isEqual(e)||(await nj(t.localStore,e),r=e)}),t.persistence.setDatabaseDeletedListener(()=>e.terminate()),e._offlineComponents=t}async function ip(e,t){e.asyncQueue.verifyOperationInProgress();let n=await iy(e);w("FirestoreClient","Initializing OnlineComponentProvider"),await t.initialize(n,e.configuration),e.setCredentialChangeListener(e=>rN(t.remoteStore,e)),e.setAppCheckTokenChangeListener((e,n)=>rN(t.remoteStore,n)),e._onlineComponents=t}async function iy(e){if(!e._offlineComponents){if(e._uninitializedComponentsProvider){w("FirestoreClient","Using user provided OfflineComponentProvider");try{await ig(e,e._uninitializedComponentsProvider._offline)}catch(t){if(!("FirebaseError"===t.name?t.code===C.FAILED_PRECONDITION||t.code===C.UNIMPLEMENTED:!("undefined"!=typeof DOMException&&t instanceof DOMException)||22===t.code||20===t.code||11===t.code))throw t;E("Error using user provided cache. Falling back to memory cache: "+t),await ig(e,new ic)}}else w("FirestoreClient","Using default OfflineComponentProvider"),await ig(e,new ic)}return e._offlineComponents}async function iv(e){return e._onlineComponents||(e._uninitializedComponentsProvider?(w("FirestoreClient","Using user provided OnlineComponentProvider"),await ip(e,e._uninitializedComponentsProvider._online)):(w("FirestoreClient","Using default OnlineComponentProvider"),await ip(e,new ih))),e._onlineComponents}async function iw(e){let t=await iv(e),n=t.eventManager;return n.onListen=rJ.bind(null,t.syncEngine),n.onUnlisten=r1.bind(null,t.syncEngine),n.onFirstRemoteStoreListen=rZ.bind(null,t.syncEngine),n.onLastRemoteStoreUnlisten=r2.bind(null,t.syncEngine),n}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function i_(e){let t={};return void 0!==e.timeoutSeconds&&(t.timeoutSeconds=e.timeoutSeconds),t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let iE=new Map;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function iT(e,t,n){if(!n)throw new A(C.INVALID_ARGUMENT,"Function ".concat(e,"() cannot be called with an empty ").concat(t,"."))}function iI(e){if(!Q.isDocumentKey(e))throw new A(C.INVALID_ARGUMENT,"Invalid document reference. Document references must have an even number of segments, but ".concat(e," has ").concat(e.length,"."))}function iC(e){if(Q.isDocumentKey(e))throw new A(C.INVALID_ARGUMENT,"Invalid collection reference. Collection references must have an odd number of segments, but ".concat(e," has ").concat(e.length,"."))}function iA(e){if(void 0===e)return"undefined";if(null===e)return"null";if("string"==typeof e)return e.length>20&&(e="".concat(e.substring(0,20),"...")),JSON.stringify(e);if("number"==typeof e||"boolean"==typeof e)return""+e;if("object"==typeof e){if(e instanceof Array)return"an array";{var t;let n=(t=e).constructor?t.constructor.name:null;return n?"a custom ".concat(n," object"):"an object"}}return"function"==typeof e?"a function":I()}function iS(e,t){if("_delegate"in e&&(e=e._delegate),!(e instanceof t)){if(t.name===e.constructor.name)throw new A(C.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{let n=iA(e);throw new A(C.INVALID_ARGUMENT,"Expected type '".concat(t.name,"', but it was: ").concat(n))}}return e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class iN{isEqual(e){var t,n;return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&(t=this.experimentalLongPollingOptions,n=e.experimentalLongPollingOptions,t.timeoutSeconds===n.timeoutSeconds)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}constructor(e){var t,n;if(void 0===e.host){if(void 0!==e.ssl)throw new A(C.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host="firestore.googleapis.com",this.ssl=!0}else this.host=e.host,this.ssl=null===(t=e.ssl)||void 0===t||t;if(this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,void 0===e.cacheSizeBytes)this.cacheSizeBytes=41943040;else{if(-1!==e.cacheSizeBytes&&e.cacheSizeBytes<1048576)throw new A(C.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}(function(e,t,n,r){if(!0===t&&!0===r)throw new A(C.INVALID_ARGUMENT,"".concat(e," and ").concat(n," cannot be used together."))})("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:void 0===e.experimentalAutoDetectLongPolling?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=i_(null!==(n=e.experimentalLongPollingOptions)&&void 0!==n?n:{}),function(e){if(void 0!==e.timeoutSeconds){if(isNaN(e.timeoutSeconds))throw new A(C.INVALID_ARGUMENT,"invalid long polling timeout: ".concat(e.timeoutSeconds," (must not be NaN)"));if(e.timeoutSeconds<5)throw new A(C.INVALID_ARGUMENT,"invalid long polling timeout: ".concat(e.timeoutSeconds," (minimum allowed value is 5)"));if(e.timeoutSeconds>30)throw new A(C.INVALID_ARGUMENT,"invalid long polling timeout: ".concat(e.timeoutSeconds," (maximum allowed value is 30)"))}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}}class ik{get app(){if(!this._app)throw new A(C.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return"notTerminated"!==this._terminateTask}_setSettings(e){if(this._settingsFrozen)throw new A(C.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new iN(e),void 0!==e.credentials&&(this._authCredentials=function(e){if(!e)return new k;switch(e.type){case"firstParty":return new x(e.sessionIndex||"0",e.iamToken||null,e.authTokenFactory||null);case"provider":return e.client;default:throw new A(C.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(e.credentials))}_getSettings(){return this._settings}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return"notTerminated"===this._terminateTask&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){"notTerminated"===this._terminateTask?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(e){let t=iE.get(e);t&&(w("ComponentProvider","Removing Datastore"),iE.delete(e),t.terminate())}(this),Promise.resolve()}constructor(e,t,n,r){this._authCredentials=e,this._appCheckCredentials=t,this._databaseId=n,this._app=r,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new iN({}),this._settingsFrozen=!1,this._terminateTask="notTerminated"}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ib{withConverter(e){return new ib(this.firestore,e,this._query)}constructor(e,t,n){this.converter=t,this._query=n,this.type="query",this.firestore=e}}class iD{get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new iR(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new iD(this.firestore,e,this._key)}constructor(e,t,n){this.converter=t,this._key=n,this.type="document",this.firestore=e}}class iR extends ib{get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){let e=this._path.popLast();return e.isEmpty()?null:new iD(this.firestore,null,new Q(e))}withConverter(e){return new iR(this.firestore,e,this._path)}constructor(e,t,n){super(e,t,new e8(n)),this._path=n,this.type="collection"}}function ix(e,t){for(var n=arguments.length,r=Array(n>2?n-2:0),i=2;i<n;i++)r[i-2]=arguments[i];if(e=(0,c.m9)(e),iT("collection","path",t),e instanceof ik){let n=B.fromString(t,...r);return iC(n),new iR(e,null,n)}{if(!(e instanceof iD||e instanceof iR))throw new A(C.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");let n=e._path.child(B.fromString(t,...r));return iC(n),new iR(e.firestore,null,n)}}function iL(e,t){for(var n=arguments.length,r=Array(n>2?n-2:0),i=2;i<n;i++)r[i-2]=arguments[i];if(e=(0,c.m9)(e),1==arguments.length&&(t=M.newId()),iT("doc","path",t),e instanceof ik){let n=B.fromString(t,...r);return iI(n),new iD(e,null,new Q(n))}{if(!(e instanceof iD||e instanceof iR))throw new A(C.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");let n=e._path.child(B.fromString(t,...r));return iI(n),new iD(e.firestore,e instanceof iR?e.converter:null,new Q(n))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class iV{get isShuttingDown(){return this.Iu}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.fu(),this.gu(e)}enterRestrictedMode(e){if(!this.Iu){this.Iu=!0,this.Au=e||!1;let t=n8();t&&"function"==typeof t.removeEventListener&&t.removeEventListener("visibilitychange",this.Vu)}}enqueue(e){if(this.fu(),this.Iu)return new Promise(()=>{});let t=new S;return this.gu(()=>this.Iu&&this.Au?Promise.resolve():(e().then(t.resolve,t.reject),t.promise)).then(()=>t.promise)}enqueueRetryable(e){this.enqueueAndForget(()=>(this.Pu.push(e),this.pu()))}async pu(){if(0!==this.Pu.length){try{await this.Pu[0](),this.Pu.shift(),this.t_.reset()}catch(e){if(!X(e))throw e;w("AsyncQueue","Operation failed with retryable error: "+e)}this.Pu.length>0&&this.t_.Go(()=>this.pu())}}gu(e){let t=this.mu.then(()=>(this.du=!0,e().catch(e=>{let t;throw this.Eu=e,this.du=!1,_("INTERNAL UNHANDLED ERROR: ",(t=e.message||"",e.stack&&(t=e.stack.includes(e.message)?e.stack:e.message+"\n"+e.stack),t)),e}).then(e=>(this.du=!1,e))));return this.mu=t,t}enqueueAfterDelay(e,t,n){this.fu(),this.Ru.indexOf(e)>-1&&(t=0);let r=rR.createAndSchedule(this,e,t,n,e=>this.yu(e));return this.Tu.push(r),r}fu(){this.Eu&&I()}verifyOperationInProgress(){}async wu(){let e;do e=this.mu,await e;while(e!==this.mu)}Su(e){for(let t of this.Tu)if(t.timerId===e)return!0;return!1}bu(e){return this.wu().then(()=>{for(let t of(this.Tu.sort((e,t)=>e.targetTimeMs-t.targetTimeMs),this.Tu))if(t.skipDelay(),"all"!==e&&t.timerId===e)break;return this.wu()})}Du(e){this.Ru.push(e)}yu(e){let t=this.Tu.indexOf(e);this.Tu.splice(t,1)}constructor(e=Promise.resolve()){this.Pu=[],this.Iu=!1,this.Tu=[],this.Eu=null,this.du=!1,this.Au=!1,this.Ru=[],this.t_=new n6(this,"async_queue_retry"),this.Vu=()=>{let e=n8();e&&w("AsyncQueue","Visibility state changed to "+e.visibilityState),this.t_.jo()},this.mu=e;let t=n8();t&&"function"==typeof t.addEventListener&&t.addEventListener("visibilitychange",this.Vu)}}function iM(e){return function(e,t){if("object"!=typeof e||null===e)return!1;for(let n of t)if(n in e&&"function"==typeof e[n])return!0;return!1}(e,["next","error","complete"])}class iO extends ik{async _terminate(){if(this._firestoreClient){let e=this._firestoreClient.terminate();this._queue=new iV(e),this._firestoreClient=void 0,await e}}constructor(e,t,n,r){super(e,t,n,r),this.type="firestore",this._queue=new iV,this._persistenceKey=(null==r?void 0:r.name)||"[DEFAULT]"}}function iF(e,t){let n="object"==typeof e?e:(0,o.Mq)(),r=(0,o.qX)(n,"firestore").getImmediate({identifier:"string"==typeof e?e:t||"(default)"});if(!r._initialized){let e=(0,c.P0)("firestore");e&&function(e,t,n){var r;let i=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{},s=(e=iS(e,ik))._getSettings(),a="".concat(t,":").concat(n);if("firestore.googleapis.com"!==s.host&&s.host!==a&&E("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used."),e._setSettings(Object.assign(Object.assign({},s),{host:a,ssl:!1})),i.mockUserToken){let t,n;if("string"==typeof i.mockUserToken)t=i.mockUserToken,n=g.MOCK_USER;else{t=(0,c.Sg)(i.mockUserToken,null===(r=e._app)||void 0===r?void 0:r.options.projectId);let s=i.mockUserToken.sub||i.mockUserToken.user_id;if(!s)throw new A(C.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");n=new g(s)}e._authCredentials=new b(new N(t,n))}}(r,...e)}return r}function iP(e){if(e._terminated)throw new A(C.FAILED_PRECONDITION,"The client has already been terminated.");return e._firestoreClient||function(e){var t,n,r,i;let s=e._freezeSettings(),a=(i=e._databaseId,new ey(i,(null===(t=e._app)||void 0===t?void 0:t.options.appId)||"",e._persistenceKey,s.host,s.ssl,s.experimentalForceLongPolling,s.experimentalAutoDetectLongPolling,i_(s.experimentalLongPollingOptions),s.useFetchStreams));e._componentsProvider||(null===(n=s.localCache)||void 0===n?void 0:n._offlineComponentProvider)&&(null===(r=s.localCache)||void 0===r?void 0:r._onlineComponentProvider)&&(e._componentsProvider={_offline:s.localCache._offlineComponentProvider,_online:s.localCache._onlineComponentProvider}),e._firestoreClient=new im(e._authCredentials,e._appCheckCredentials,e._queue,a,e._componentsProvider&&function(e){let t=null==e?void 0:e._online.build();return{_offline:null==e?void 0:e._offline.build(t),_online:t}}(e._componentsProvider))}(e),e._firestoreClient}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class iU{static fromBase64String(e){try{return new iU(eu.fromBase64String(e))}catch(e){throw new A(C.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+e)}}static fromUint8Array(e){return new iU(eu.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}constructor(e){this._byteString=e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class iq{isEqual(e){return this._internalPath.isEqual(e._internalPath)}constructor(...e){for(let t=0;t<e.length;++t)if(0===e[t].length)throw new A(C.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new K(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class iB{constructor(e){this._methodName=e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class iz{get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}toJSON(){return{latitude:this._lat,longitude:this._long}}_compareTo(e){return O(this._lat,e._lat)||O(this._long,e._long)}constructor(e,t){if(!isFinite(e)||e<-90||e>90)throw new A(C.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(t)||t<-180||t>180)throw new A(C.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+t);this._lat=e,this._long=t}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class iK{toArray(){return this._values.map(e=>e)}isEqual(e){return function(e,t){if(e.length!==t.length)return!1;for(let n=0;n<e.length;++n)if(e[n]!==t[n])return!1;return!0}(this._values,e._values)}constructor(e){this._values=(e||[]).map(e=>e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let iQ=/^__.*__$/;class iG{toMutation(e,t){return null!==this.fieldMask?new tU(e,this.data,this.fieldMask,t,this.fieldTransforms):new tP(e,this.data,t,this.fieldTransforms)}constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}}class ij{toMutation(e,t){return new tU(e,this.data,this.fieldMask,t,this.fieldTransforms)}constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}}function iW(e){switch(e){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw I()}}class iH{get path(){return this.settings.path}get Cu(){return this.settings.Cu}Fu(e){return new iH(Object.assign(Object.assign({},this.settings),e),this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}Mu(e){var t;let n=null===(t=this.path)||void 0===t?void 0:t.child(e),r=this.Fu({path:n,xu:!1});return r.Ou(e),r}Nu(e){var t;let n=null===(t=this.path)||void 0===t?void 0:t.child(e),r=this.Fu({path:n,xu:!1});return r.vu(),r}Lu(e){return this.Fu({path:void 0,xu:!0})}Bu(e){return i7(e,this.settings.methodName,this.settings.ku||!1,this.path,this.settings.qu)}contains(e){return void 0!==this.fieldMask.find(t=>e.isPrefixOf(t))||void 0!==this.fieldTransforms.find(t=>e.isPrefixOf(t.field))}vu(){if(this.path)for(let e=0;e<this.path.length;e++)this.Ou(this.path.get(e))}Ou(e){if(0===e.length)throw this.Bu("Document fields must not be empty");if(iW(this.Cu)&&iQ.test(e))throw this.Bu('Document fields cannot begin and end with "__"')}constructor(e,t,n,r,i,s){this.settings=e,this.databaseId=t,this.serializer=n,this.ignoreUndefinedProperties=r,void 0===i&&this.vu(),this.fieldTransforms=i||[],this.fieldMask=s||[]}}class iY{Qu(e,t,n){let r=arguments.length>3&&void 0!==arguments[3]&&arguments[3];return new iH({Cu:e,methodName:t,qu:n,path:K.emptyPath(),xu:!1,ku:r},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}constructor(e,t,n){this.databaseId=e,this.ignoreUndefinedProperties=t,this.serializer=n||n5(e)}}function iX(e){let t=e._freezeSettings(),n=n5(e._databaseId);return new iY(e._databaseId,!!t.ignoreUndefinedProperties,n)}function iJ(e,t,n,r,i){let s,a,o=arguments.length>5&&void 0!==arguments[5]?arguments[5]:{},l=e.Qu(o.merge||o.mergeFields?2:0,t,n,i);i9("Data must be an object, but it was:",l,r);let u=i3(r,l);if(o.merge)s=new eo(l.fieldMask),a=l.fieldTransforms;else if(o.mergeFields){let e=[];for(let r of o.mergeFields){let i=i8(t,r,n);if(!l.contains(i))throw new A(C.INVALID_ARGUMENT,"Field '".concat(i,"' is specified in your field mask but missing from your input data."));se(e,i)||e.push(i)}s=new eo(e),a=l.fieldTransforms.filter(e=>s.covers(e.field))}else s=null,a=l.fieldTransforms;return new iG(new eO(u),s,a)}class iZ extends iB{_toFieldTransform(e){if(2!==e.Cu)throw 1===e.Cu?e.Bu("".concat(this._methodName,"() can only appear at the top level of your update data")):e.Bu("".concat(this._methodName,"() cannot be used with set() unless you pass {merge:true}"));return e.fieldMask.push(e.path),null}isEqual(e){return e instanceof iZ}}class i$ extends iB{_toFieldTransform(e){return new tD(e.path,new tT)}isEqual(e){return e instanceof i$}}function i0(e,t,n,r){let i=e.Qu(1,t,n);i9("Data must be an object, but it was:",i,r);let s=[],a=eO.empty();return ee(r,(e,r)=>{let o=i6(t,e,n);r=(0,c.m9)(r);let l=i.Nu(o);if(r instanceof iZ)s.push(o);else{let e=i2(r,l);null!=e&&(s.push(o),a.set(o,e))}}),new ij(a,new eo(s),i.fieldTransforms)}function i1(e,t,n,r,i,s){let a=e.Qu(1,t,n),o=[i8(t,r,n)],l=[i];if(s.length%2!=0)throw new A(C.INVALID_ARGUMENT,"Function ".concat(t,"() needs to be called with an even number of arguments that alternate between field names and values."));for(let e=0;e<s.length;e+=2)o.push(i8(t,s[e])),l.push(s[e+1]);let u=[],h=eO.empty();for(let e=o.length-1;e>=0;--e)if(!se(u,o[e])){let t=o[e],n=l[e];n=(0,c.m9)(n);let r=a.Nu(t);if(n instanceof iZ)u.push(t);else{let e=i2(n,r);null!=e&&(u.push(t),h.set(t,e))}}return new ij(h,new eo(u),a.fieldTransforms)}function i2(e,t){if(i4(e=(0,c.m9)(e)))return i9("Unsupported field value:",t,e),i3(e,t);if(e instanceof iB)return function(e,t){if(!iW(t.Cu))throw t.Bu("".concat(e._methodName,"() can only be used with update() and set()"));if(!t.path)throw t.Bu("".concat(e._methodName,"() is not currently supported inside arrays"));let n=e._toFieldTransform(t);n&&t.fieldTransforms.push(n)}(e,t),null;if(void 0===e&&t.ignoreUndefinedProperties)return null;if(t.path&&t.fieldMask.push(t.path),e instanceof Array){if(t.settings.xu&&4!==t.Cu)throw t.Bu("Nested arrays are not supported");return function(e,t){let n=[],r=0;for(let i of e){let e=i2(i,t.Lu(r));null==e&&(e={nullValue:"NULL_VALUE"}),n.push(e),r++}return{arrayValue:{values:n}}}(e,t)}return function(e,t){var n,r,i;if(null===(e=(0,c.m9)(e)))return{nullValue:"NULL_VALUE"};if("number"==typeof e)return n=t.serializer,"number"==typeof(i=r=e)&&Number.isInteger(i)&&!Z(i)&&i<=Number.MAX_SAFE_INTEGER&&i>=Number.MIN_SAFE_INTEGER?tw(r):tv(n,r);if("boolean"==typeof e)return{booleanValue:e};if("string"==typeof e)return{stringValue:e};if(e instanceof Date){let n=P.fromDate(e);return{timestampValue:ns(t.serializer,n)}}if(e instanceof P){let n=new P(e.seconds,1e3*Math.floor(e.nanoseconds/1e3));return{timestampValue:ns(t.serializer,n)}}if(e instanceof iz)return{geoPointValue:{latitude:e.latitude,longitude:e.longitude}};if(e instanceof iU)return{bytesValue:na(t.serializer,e._byteString)};if(e instanceof iD){let n=t.databaseId,r=e.firestore._databaseId;if(!r.isEqual(n))throw t.Bu("Document reference is for database ".concat(r.projectId,"/").concat(r.database," but should be for database ").concat(n.projectId,"/").concat(n.database));return{referenceValue:nl(e.firestore._databaseId||t.databaseId,e._key.path)}}if(e instanceof iK)return{mapValue:{fields:{__type__:{stringValue:"__vector__"},value:{arrayValue:{values:e.toArray().map(e=>{if("number"!=typeof e)throw t.Bu("VectorValues must only contain numeric values.");return tv(t.serializer,e)})}}}}};throw t.Bu("Unsupported field value: ".concat(iA(e)))}(e,t)}function i3(e,t){let n={};return et(e)?t.path&&t.path.length>0&&t.fieldMask.push(t.path):ee(e,(e,r)=>{let i=i2(r,t.Mu(e));null!=i&&(n[e]=i)}),{mapValue:{fields:n}}}function i4(e){return!("object"!=typeof e||null===e||e instanceof Array||e instanceof Date||e instanceof P||e instanceof iz||e instanceof iU||e instanceof iD||e instanceof iB||e instanceof iK)}function i9(e,t,n){if(!i4(n)||!("object"==typeof n&&null!==n&&(Object.getPrototypeOf(n)===Object.prototype||null===Object.getPrototypeOf(n)))){let r=iA(n);throw"an object"===r?t.Bu(e+" a custom object"):t.Bu(e+" "+r)}}function i8(e,t,n){if((t=(0,c.m9)(t))instanceof iq)return t._internalPath;if("string"==typeof t)return i6(e,t);throw i7("Field path arguments must be of type string or ",e,!1,void 0,n)}let i5=RegExp("[~\\*/\\[\\]]");function i6(e,t,n){if(t.search(i5)>=0)throw i7("Invalid field path (".concat(t,"). Paths must not contain '~', '*', '/', '[', or ']'"),e,!1,void 0,n);try{return new iq(...t.split("."))._internalPath}catch(r){throw i7("Invalid field path (".concat(t,"). Paths must not be empty, begin with '.', end with '.', or contain '..'"),e,!1,void 0,n)}}function i7(e,t,n,r,i){let s=r&&!r.isEmpty(),a=void 0!==i,o="Function ".concat(t,"() called with invalid data");n&&(o+=" (via `toFirestore()`)"),o+=". ";let l="";return(s||a)&&(l+=" (found",s&&(l+=" in field ".concat(r)),a&&(l+=" in document ".concat(i)),l+=")"),new A(C.INVALID_ARGUMENT,o+e+l)}function se(e,t){return e.some(e=>e.isEqual(t))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class st{get id(){return this._key.path.lastSegment()}get ref(){return new iD(this._firestore,this._converter,this._key)}exists(){return null!==this._document}data(){if(this._document){if(this._converter){let e=new sn(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}get(e){if(this._document){let t=this._document.data.field(sr("DocumentSnapshot.get",e));if(null!==t)return this._userDataWriter.convertValue(t)}}constructor(e,t,n,r,i){this._firestore=e,this._userDataWriter=t,this._key=n,this._document=r,this._converter=i}}class sn extends st{data(){return super.data()}}function sr(e,t){return"string"==typeof t?i6(e,t):t instanceof iq?t._internalPath:t._delegate._internalPath}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function si(e){if("L"===e.limitType&&0===e.explicitOrderBy.length)throw new A(C.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class ss{}class sa extends ss{}function so(e,t){for(var n=arguments.length,r=Array(n>2?n-2:0),i=2;i<n;i++)r[i-2]=arguments[i];let s=[];for(let n of(t instanceof ss&&s.push(t),function(e){let t=e.filter(e=>e instanceof sc).length,n=e.filter(e=>e instanceof sl).length;if(t>1||t>0&&n>0)throw new A(C.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")}(s=s.concat(r)),s))e=n._apply(e);return e}class sl extends sa{static _create(e,t,n){return new sl(e,t,n)}_apply(e){let t=this._parse(e);return sg(e._query,t),new ib(e.firestore,e.converter,tt(e._query,t))}_parse(e){let t=iX(e.firestore);return function(e,t,n,r,i,s,a){let o;if(i.isKeyField()){if("array-contains"===s||"array-contains-any"===s)throw new A(C.INVALID_ARGUMENT,"Invalid Query. You can't perform '".concat(s,"' queries on documentId()."));if("in"===s||"not-in"===s){sm(a,s);let t=[];for(let n of a)t.push(sf(r,e,n));o={arrayValue:{values:t}}}else o=sf(r,e,a)}else"in"!==s&&"not-in"!==s&&"array-contains-any"!==s||sm(a,s),o=function(e,t,n){let r=arguments.length>3&&void 0!==arguments[3]&&arguments[3];return i2(n,e.Qu(r?4:3,t))}(n,t,a,"in"===s||"not-in"===s);return eK.create(i,s,o)}(e._query,"where",t,e.firestore._databaseId,this._field,this._op,this._value)}constructor(e,t,n){super(),this._field=e,this._op=t,this._value=n,this.type="where"}}function su(e,t,n){let r=sr("where",e);return sl._create(r,t,n)}class sc extends ss{static _create(e,t){return new sc(e,t)}_parse(e){let t=this._queryConstraints.map(t=>t._parse(e)).filter(e=>e.getFilters().length>0);return 1===t.length?t[0]:eQ.create(t,this._getOperator())}_apply(e){let t=this._parse(e);return 0===t.getFilters().length?e:(function(e,t){let n=e;for(let e of t.getFlattenedFilters())sg(n,e),n=tt(n,e)}(e._query,t),new ib(e.firestore,e.converter,tt(e._query,t)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return"and"===this.type?"and":"or"}constructor(e,t){super(),this.type=e,this._queryConstraints=t}}class sh extends sa{static _create(e,t){return new sh(e,t)}_apply(e){let t=function(e,t,n){if(null!==e.startAt)throw new A(C.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(null!==e.endAt)throw new A(C.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");return new eB(t,n)}(e._query,this._field,this._direction);return new ib(e.firestore,e.converter,function(e,t){let n=e.explicitOrderBy.concat([t]);return new e8(e.path,e.collectionGroup,n,e.filters.slice(),e.limit,e.limitType,e.startAt,e.endAt)}(e._query,t))}constructor(e,t){super(),this._field=e,this._direction=t,this.type="orderBy"}}function sd(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"asc",n=sr("orderBy",e);return sh._create(n,t)}function sf(e,t,n){if("string"==typeof(n=(0,c.m9)(n))){if(""===n)throw new A(C.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!e6(t)&&-1!==n.indexOf("/"))throw new A(C.INVALID_ARGUMENT,"Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '".concat(n,"' contains a '/' character."));let r=t.path.child(B.fromString(n));if(!Q.isDocumentKey(r))throw new A(C.INVALID_ARGUMENT,"Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '".concat(r,"' is not because it has an odd number of segments (").concat(r.length,")."));return eN(e,new Q(r))}if(n instanceof iD)return eN(e,n._key);throw new A(C.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ".concat(iA(n),"."))}function sm(e,t){if(!Array.isArray(e)||0===e.length)throw new A(C.INVALID_ARGUMENT,"Invalid Query. A non-empty array is required for '".concat(t.toString(),"' filters."))}function sg(e,t){let n=function(e,t){for(let n of e)for(let e of n.getFlattenedFilters())if(t.indexOf(e.op)>=0)return e.op;return null}(e.filters,function(e){switch(e){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}}(t.op));if(null!==n)throw n===t.op?new A(C.INVALID_ARGUMENT,"Invalid query. You cannot use more than one '".concat(t.op.toString(),"' filter.")):new A(C.INVALID_ARGUMENT,"Invalid query. You cannot use '".concat(t.op.toString(),"' filters with '").concat(n.toString(),"' filters."))}class sp{convertValue(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"none";switch(e_(e)){case 0:return null;case 1:return e.booleanValue;case 2:return ed(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,t);case 5:return e.stringValue;case 6:return this.convertBytes(ef(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,t);case 11:return this.convertObject(e.mapValue,t);case 10:return this.convertVectorValue(e.mapValue);default:throw I()}}convertObject(e,t){return this.convertObjectMap(e.fields,t)}convertObjectMap(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"none",n={};return ee(e,(e,r)=>{n[e]=this.convertValue(r,t)}),n}convertVectorValue(e){var t,n,r;return new iK(null===(r=null===(n=null===(t=e.fields)||void 0===t?void 0:t.value.arrayValue)||void 0===n?void 0:n.values)||void 0===r?void 0:r.map(e=>ed(e.doubleValue)))}convertGeoPoint(e){return new iz(ed(e.latitude),ed(e.longitude))}convertArray(e,t){return(e.values||[]).map(e=>this.convertValue(e,t))}convertServerTimestamp(e,t){switch(t){case"previous":let n=eg(e);return null==n?null:this.convertValue(n,t);case"estimate":return this.convertTimestamp(ep(e));default:return null}}convertTimestamp(e){let t=eh(e);return new P(t.seconds,t.nanos)}convertDocumentKey(e,t){let n=B.fromString(e);nw(n)||I();let r=new ev(n.get(1),n.get(3)),i=new Q(n.popFirst(5));return r.isEqual(t)||_("Document ".concat(i," contains a document reference within a different database (").concat(r.projectId,"/").concat(r.database,") which is not supported. It will be treated as a reference in the current database (").concat(t.projectId,"/").concat(t.database,") instead.")),i}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function sy(e,t,n){return e?n&&(n.merge||n.mergeFields)?e.toFirestore(t,n):e.toFirestore(t):t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sv{isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}constructor(e,t){this.hasPendingWrites=e,this.fromCache=t}}class sw extends st{exists(){return super.exists()}data(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};if(this._document){if(this._converter){let t=new s_(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(t,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};if(this._document){let n=this._document.data.field(sr("DocumentSnapshot.get",e));if(null!==n)return this._userDataWriter.convertValue(n,t.serverTimestamps)}}constructor(e,t,n,r,i,s){super(e,t,n,r,s),this._firestore=e,this._firestoreImpl=e,this.metadata=i}}class s_ extends sw{data(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};return super.data(e)}}class sE{get docs(){let e=[];return this.forEach(t=>e.push(t)),e}get size(){return this._snapshot.docs.size}get empty(){return 0===this.size}forEach(e,t){this._snapshot.docs.forEach(n=>{e.call(t,new s_(this._firestore,this._userDataWriter,n.key,n,new sv(this._snapshot.mutatedKeys.has(n.key),this._snapshot.fromCache),this.query.converter))})}docChanges(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},t=!!e.includeMetadataChanges;if(t&&this._snapshot.excludesMetadataChanges)throw new A(C.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===t||(this._cachedChanges=function(e,t){if(e._snapshot.oldDocs.isEmpty()){let t=0;return e._snapshot.docChanges.map(n=>{let r=new s_(e._firestore,e._userDataWriter,n.doc.key,n.doc,new sv(e._snapshot.mutatedKeys.has(n.doc.key),e._snapshot.fromCache),e.query.converter);return n.doc,{type:"added",doc:r,oldIndex:-1,newIndex:t++}})}{let n=e._snapshot.oldDocs;return e._snapshot.docChanges.filter(e=>t||3!==e.type).map(t=>{let r=new s_(e._firestore,e._userDataWriter,t.doc.key,t.doc,new sv(e._snapshot.mutatedKeys.has(t.doc.key),e._snapshot.fromCache),e.query.converter),i=-1,s=-1;return 0!==t.type&&(i=n.indexOf(t.doc.key),n=n.delete(t.doc.key)),1!==t.type&&(s=(n=n.add(t.doc)).indexOf(t.doc.key)),{type:function(e){switch(e){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return I()}}(t.type),doc:r,oldIndex:i,newIndex:s}})}}(this,t),this._cachedChangesIncludeMetadataChanges=t),this._cachedChanges}constructor(e,t,n,r){this._firestore=e,this._userDataWriter=t,this._snapshot=r,this.metadata=new sv(r.hasPendingWrites,r.fromCache),this.query=n}}class sT extends sp{convertBytes(e){return new iU(e)}convertReference(e){let t=this.convertDocumentKey(e,this.firestore._databaseId);return new iD(this.firestore,null,t)}constructor(e){super(),this.firestore=e}}function sI(e){e=iS(e,ib);let t=iS(e.firestore,iO),n=iP(t),r=new sT(t);return si(e._query),(function(e,t){let n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{},r=new S;return e.asyncQueue.enqueueAndForget(async()=>(function(e,t,n,r,i){let s=new id({next:n=>{s.Za(),t.enqueueAndForget(()=>rq(e,a)),n.fromCache&&"server"===r.source?i.reject(new A(C.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):i.resolve(n)},error:e=>i.reject(e)}),a=new rQ(n,s,{includeMetadataChanges:!0,_a:!0});return rU(e,a)})(await iw(e),e.asyncQueue,t,n,r)),r.promise})(n,e._query).then(n=>new sE(t,r,e,n))}function sC(e,t,n){e=iS(e,iD);let r=iS(e.firestore,iO),i=sy(e.converter,t,n);return sb(r,[iJ(iX(r),"setDoc",e._key,i,null!==e.converter,n).toMutation(e._key,tx.none())])}function sA(e,t,n){for(var r=arguments.length,i=Array(r>3?r-3:0),s=3;s<r;s++)i[s-3]=arguments[s];e=iS(e,iD);let a=iS(e.firestore,iO),o=iX(a);return sb(a,[("string"==typeof(t=(0,c.m9)(t))||t instanceof iq?i1(o,"updateDoc",e._key,t,n,i):i0(o,"updateDoc",e._key,t)).toMutation(e._key,tx.exists(!0))])}function sS(e){return sb(iS(e.firestore,iO),[new tK(e._key,tx.none())])}function sN(e,t){let n=iS(e.firestore,iO),r=iL(e),i=sy(e.converter,t);return sb(n,[iJ(iX(e.firestore),"addDoc",r._key,i,null!==e.converter,{}).toMutation(r._key,tx.exists(!1))]).then(()=>r)}function sk(e){let t,n,r;for(var i,s,a,o=arguments.length,l=Array(o>1?o-1:0),u=1;u<o;u++)l[u-1]=arguments[u];e=(0,c.m9)(e);let h={includeMetadataChanges:!1,source:"default"},d=0;"object"!=typeof l[0]||iM(l[d])||(h=l[d],d++);let f={includeMetadataChanges:h.includeMetadataChanges,source:h.source};if(iM(l[d])){let e=l[d];l[d]=null===(i=e.next)||void 0===i?void 0:i.bind(e),l[d+1]=null===(s=e.error)||void 0===s?void 0:s.bind(e),l[d+2]=null===(a=e.complete)||void 0===a?void 0:a.bind(e)}if(e instanceof iD)n=iS(e.firestore,iO),r=new e8(e._key.path),t={next:t=>{l[d]&&l[d](function(e,t,n){let r=n.docs.get(t._key),i=new sT(e);return new sw(e,i,t._key,r,new sv(n.hasPendingWrites,n.fromCache),t.converter)}(n,e,t))},error:l[d+1],complete:l[d+2]};else{let i=iS(e,ib);n=iS(i.firestore,iO),r=i._query;let s=new sT(n);t={next:e=>{l[d]&&l[d](new sE(n,s,i,e))},error:l[d+1],complete:l[d+2]},si(e._query)}return function(e,t,n,r){let i=new id(r),s=new rQ(t,i,n);return e.asyncQueue.enqueueAndForget(async()=>rU(await iw(e),s)),()=>{i.Za(),e.asyncQueue.enqueueAndForget(async()=>rq(await iw(e),s))}}(iP(n),r,f,t)}function sb(e,t){return function(e,t){let n=new S;return e.asyncQueue.enqueueAndForget(async()=>r3(await iv(e).then(e=>e.syncEngine),t,n)),n.promise}(iP(e),t)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sD{set(e,t,n){this._verifyNotCommitted();let r=sR(e,this._firestore),i=sy(r.converter,t,n),s=iJ(this._dataReader,"WriteBatch.set",r._key,i,null!==r.converter,n);return this._mutations.push(s.toMutation(r._key,tx.none())),this}update(e,t,n){let r;for(var i=arguments.length,s=Array(i>3?i-3:0),a=3;a<i;a++)s[a-3]=arguments[a];this._verifyNotCommitted();let o=sR(e,this._firestore);return r="string"==typeof(t=(0,c.m9)(t))||t instanceof iq?i1(this._dataReader,"WriteBatch.update",o._key,t,n,s):i0(this._dataReader,"WriteBatch.update",o._key,t),this._mutations.push(r.toMutation(o._key,tx.exists(!0))),this}delete(e){this._verifyNotCommitted();let t=sR(e,this._firestore);return this._mutations=this._mutations.concat(new tK(t._key,tx.none())),this}commit(){return this._verifyNotCommitted(),this._committed=!0,this._mutations.length>0?this._commitHandler(this._mutations):Promise.resolve()}_verifyNotCommitted(){if(this._committed)throw new A(C.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.")}constructor(e,t){this._firestore=e,this._commitHandler=t,this._mutations=[],this._committed=!1,this._dataReader=iX(e)}}function sR(e,t){if((e=(0,c.m9)(e)).firestore!==t)throw new A(C.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return e}function sx(){return new i$("serverTimestamp")}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function sL(e){return iP(e=iS(e,iO)),new sD(e,t=>sb(e,t))}new WeakMap,function(){let e=!(arguments.length>1)||void 0===arguments[1]||arguments[1];p=o.Jn,(0,o.Xd)(new l.wA("firestore",(t,n)=>{let{instanceIdentifier:r,options:i}=n,s=t.getProvider("app").getImmediate(),a=new iO(new D(t.getProvider("auth-internal")),new V(t.getProvider("app-check-internal")),function(e,t){if(!Object.prototype.hasOwnProperty.apply(e.options,["projectId"]))throw new A(C.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new ev(e.options.projectId,t)}(s,r),s);return i=Object.assign({useFetchStreams:e},i),a._setSettings(i),a},"PUBLIC").setMultipleInstances(!0)),(0,o.KN)(m,"4.7.3",void 0),(0,o.KN)(m,"4.7.3","esm2017")}()}}]);