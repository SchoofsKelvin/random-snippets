
type Constructor<T> = new () => T;
function mixedClass<C>(...classes: Constructor<any>[]): Constructor<C> {
    const chain: Constructor<C> = (class {}) as any;
    let current = chain.prototype;
    current.constructor = chain;
    for (const constructor of classes) {
        console.log('=========');
        console.log('constructor:', constructor);
        console.log('prototype:', constructor.prototype, constructor.prototype.methodA);
        const props = Object.getOwnPropertyDescriptors(constructor.prototype);
        console.log('current1:', current, current.methodA);
        const next = { constructor };
        Object.defineProperties(next, props);
        Object.setPrototypeOf(current, next);
        console.log('current2:', current, current.methodA);
        current = next;
    }
    return chain;
}

class A {
    public idk: string = 'a';
    methodA() {
        return this.idk;
    }
}
console.log('SDFSDFSDSDF', new A() instanceof A);
class B {
    public idk: string = 'b';
    methodB() {
        return this.idk;
    }
    set idk_setter(value: string) {
        this.idk = value;
    }
}

const C = mixedClass<A & B>(A, B);
console.log('C', C);

const c = new C();
c.idk_setter = 'c';

let proto = Object.getPrototypeOf(c);
while (proto) {
    console.log('PROTO', proto, proto.constructor);
    console.log(JSON.stringify(proto));
    proto = Object.getPrototypeOf(proto);
}

console.log('A:', c.methodA(), c instanceof A);
console.log('B:', c.methodB(), c instanceof B);
console.log('Date?', c instanceof Date);

Object.defineProperty(A, Symbol.hasInstance, { value: () => true });

console.log('A', A[Symbol.hasInstance]);
console.log('B', B[Symbol.hasInstance]);
console.log('C', C[Symbol.hasInstance]);
console.log('A:', c.methodA(), c instanceof A);
console.log('B:', c.methodB(), c instanceof B);

export { };
