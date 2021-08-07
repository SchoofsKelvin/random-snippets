

type ConstructorAnyArgs<P> = new (...a: any[]) => P;
type ConstructorFor<P> = new (...a: any[]) => P;
type Constructor<C> = C extends { new(...a: infer A): infer B } ? (new (...a: A) => B) : never;
type ConstructorClass<C> = C extends { new(...a: infer A): infer B } ? { new(...a: A): B } : never;

interface Product {
    productField: string;
    productMethod(): void;
}

interface Factory<P extends Product> {
    createProduct(): P;
}

function withFactory<P extends Product, PC extends ConstructorFor<P> = ConstructorFor<P>>(
    prodClass: PC, factory: Factory<P>): PC & typeof factory {
    return Object.assign(prodClass, factory);
}

class ProductImpl implements Product {
    constructor(public productField: string) { }
    public productMethod(): void {
        throw new Error("Method not implemented.");
    }
}

type constrForImpl = ConstructorFor<ProductImpl>;

const abc = withFactory<ProductImpl>(ProductImpl, {
    createProduct: () => new ProductImpl('test'),
});

class ProFacImpl extends withFactory<ProductImpl>(ProductImpl, {} as any) {

}


function withStatic<C, S>(c: C, s: S): C & S {
    return Object.assign(c, s);
}
class ProFacImpl2 extends withStatic(ProductImpl, {} as Factory<ProductImpl>) {

}

function Factory<P extends Product>() {
    return <U extends Factory<P>>(constructor: U) => {};
}
@Factory<DecoratorTest>()
class DecoratorTest extends ProductImpl {
    constructor(abc: number) { super('hi'); }
    public static createProduct() {
        return new DecoratorTest(123);
    }
}

const dec = new DecoratorTest(123);
DecoratorTest.createProduct();

abstract class AbstractFactory implements Product {
    public abstract productField: string;
    public abstract productMethod(): void;
    public static createProduct(): Product { return null! }
}
class ABC extends AbstractFactory {
    public productField: string = '';
    public productMethod(): void {
        throw new Error("Method not implemented.");
    }
}

class InterfaceHax extends ProductImpl {
    this: number = 123;
}
interface InterfaceHax {
    createProduct(): ProductImpl;
}

const idk = new InterfaceHax('').this;

export {};
