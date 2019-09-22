/*global describe, it, require*/
"use strict";
var Rule = require('ki1r0y-rules');

describe('A Rule', () => {
    describe('example', () => {
        it('works with instances', () => {
            var box = {};
            Rule.attach(box, 'width');
            Rule.attach(box, 'length');
            box.length = 5;
            expect(box.length).toBe(5);
            box.width = 7;
            Rule.attach(box, 'area', function (self) { return self.width * self.length; });
            expect(box.area).toBe(35);
            expect(box.area).toBe(35);
            Rule.attach(box, 'height');
            box.height = 2
            Rule.attach(box, 'volume', function (self) { return self.area * self.height; });
            expect(box.volume).toBe(70);
            box.length = 6;
            expect(box.area).toBe(42);
            expect(box.volume).toBe(84);
            // Test requires mechanism.
            box.area = 1000;
            box.width = 8;
            expect(box.area).toBe(1000); // still, not reset
            expect(box.volume).toBe(2000);
        });
        it('works with classes', () => {
            class Rectangle {}
            Rule.attach(Rectangle.prototype, 'width');
            Rule.attach(Rectangle.prototype, 'length');
            Rule.attach(Rectangle.prototype, 'area', function (self) { return self.width * self.length; });
            class Box extends Rectangle { }
            Rule.attach(Box.prototype, 'height');
            Rule.attach(Box.prototype, 'volume', function (self) { return self.area * self.height; });
            var box = new Box();
            box.length = 5;
            expect(box.length).toBe(5);
            box.width = 7;
            expect(box.area).toBe(35);
            expect(box.area).toBe(35);
            box.height = 2;
            expect(box.volume).toBe(70);
            box.length = 6;
            expect(box.area).toBe(42);
            expect(box.volume).toBe(84);
            box.area = 1000;
            box.width = 8;
            expect(box.area).toBe(1000); // still, not reset
            expect(box.volume).toBe(2000);
        });
        it('converts classes defined conventionally', () => {
            class Rectangle {
                width() { return 0; }
                length() { return 0; }
                area() { return this.width * this.length; }
            }
            class Box extends Rectangle {
                volume() { return this.area * this.height; }
            }
            Rule.rulify(Rectangle.prototype);
            Rule.rulify(Box.prototype, ['volume', 'height']);
            var box = new Box();
            box.length = 5;
            expect(box.length).toBe(5);
            box.width = 7;
            expect(box.area).toBe(35);
            expect(box.area).toBe(35);
            box.height = 2;
            expect(box.volume).toBe(70);
            box.length = 6;
            expect(box.area).toBe(42);
            expect(box.volume).toBe(84);
            box.area = 1000;
            box.width = 8;
            expect(box.area).toBe(1000); // still, not reset
            expect(box.volume).toBe(2000);
        });
        it('delays calculation and storage of state until used, allowing use on class prototype', () => {
            class MyClass {}
            Rule.attach(MyClass.prototype, 'myRule', () => 17);
            var instance1 = new MyClass();
            expect(instance1.myRule).toBe(17);
            instance1.myRule = 42;
            var instance2 = new MyClass();
            expect(instance2.myRule).toBe(17);
            expect(instance1.myRule).toBe(42);
        });
    });
    describe('method', () => {
        function calculator(self) { self.callCount++; return 1 + 2;}
        function calculatorOnProperty(self) { return self.ordinaryProperty + 2; }
        function calculatorOnRule(self) { return self.ordinaryProperty + self.calculator; }
        function conditionalCalculator(self) { self.callCount++; return (self.calculator < 10) ? self.calculator : self.calculatorOnRule }
        function testAnInstance(attachee, anInstance, label) {
            describe(label, () => {
                Rule.attach(attachee, 'calculator', calculator);
                Rule.attach(attachee, 'calculatorOnProperty', calculatorOnProperty);
                Rule.attach(attachee, 'calculatorOnRule', calculatorOnRule);
                Rule.attach(attachee, 'conditionalCalculator', conditionalCalculator);
                Rule.attach(attachee, 'aCircular', (self) => self.bCircular);
                Rule.attach(attachee, 'bCircular', (self) => self.cCircular);
                Rule.attach(attachee, 'cCircular', (self) => self.aCircular);
                Rule.attach(attachee, 'returnsNothing', () => { anInstance.callCount++; });
                beforeEach(() => {
                    anInstance.ordinaryProperty = 2;
                    anInstance.calculator = undefined;
                    anInstance.calculatorOnRule = undefined
                });
                
                it('does calculation', () => {
                    expect(anInstance.calculator).toBe(3);
                });
                it('can reference ordinary properties on the instance to which it is attached', () => {
                    expect(anInstance.calculatorOnProperty).toBe(4);
                });
                it('can reference other rules', () => {
                    expect(anInstance.calculatorOnRule).toBe(5);
                });
                it('is cached so that it is only computed once per instance', () => {
                    anInstance.callCount = 0;
                    
                    expect(anInstance.calculator).toBe(3);
                    expect(anInstance.callCount).toBe(1);
                    
                    expect(anInstance.calculator).toBe(3);
                    expect(anInstance.callCount).toBe(1);

                    anInstance.calculator = undefined;
                    expect(anInstance.calculator).toBe(3);
                    expect(anInstance.callCount).toBe(2);
                });
                it('does not recognize changes to ordinary properties', () => {
                    expect(anInstance.calculatorOnProperty).toBe(4);
                    anInstance.ordinaryProperty = 3;
                    expect(anInstance.calculatorOnProperty).toBe(4); // not 5
                });
                it('does recognize changes to other rules that it references', () => {
                    expect(anInstance.calculator).toBe(3);
                    expect(anInstance.calculatorOnRule).toBe(5);
                    anInstance.calculator = 30;
                    expect(anInstance.calculatorOnRule).toBe(32);
                });
                it('stops recognizing changes to other rules that references if referencing rule is bypassed by setting a value directly', () => {
                    expect(anInstance.calculator).toBe(3);
                    expect(anInstance.calculatorOnRule).toBe(5);
                    anInstance.calculatorOnRule = 6;
                    expect(anInstance.calculatorOnRule).toBe(6);
                    anInstance.calculator = 30; // compare above
                    expect(anInstance.calculatorOnRule).toBe(6);
                    anInstance.calculatorOnRule = undefined; // reset the rule
                    expect(anInstance.calculatorOnRule).toBe(32); // as above
                });
                it('recognizes circularity', () => {
                    expect(() => anInstance.aCircular).toThrowError();
                    expect(() => anInstance.bCircular).toThrowError();
                    expect(() => anInstance.cCircular).toThrowError();
                });
                xit('configurable, enumerable, this vs self and binding of this', () => {
                });
            });
        }
        var anInstance = {};
        testAnInstance(anInstance, anInstance, 'on an object');

        class Something {}
        testAnInstance(Something.prototype, new Something(), 'on a class instance');
    });
    describe('tracking dependencies', () => {
        function aPlus1(self) { return self.a + 1; }
        function bPlus1(self) { return self.b + 1; }
        function requiredPlus1(self) { return self.required + 1; }
        function requiredPlus2(self) { return self.required + 2; }
        function dependant1Plus10(self) { return self.dependant1 + 10; }
        function dependant1Plus20(self) { return self.dependant1 + 20; }
        function testAnInstance(that) {
            it('will recompute the last of a chain of three when the middle is reset, and then not again when the first is later reset', () => {
                that.a = 1;
                expect(that.c).toBe(3);
                that.b = 10;
                expect(that.a).toBe(1);
                expect(that.c).toBe(11);
                that.a = 20;
                expect(that.c).toBe(11);
            });
            it('will fan out to all dependendents when changed', () => {
                expect(that.dependant2).toBe(7);
                expect(that.dependant1a).toBe(16);
                expect(that.dependant1b).toBe(26);
                that.required = 3;
                expect(that.dependant1a).toBe(14);
                expect(that.dependant1b).toBe(24);
                expect(that.dependant2).toBe(5);
            });
        }
        describe('on instance', () => {
            var that = {};
            Rule.attach(that, 'a');
            Rule.attach(that, 'b', aPlus1);
            Rule.attach(that, 'c', bPlus1);
            Rule.attach(that, 'required');
            that.required = 5;
            Rule.attach(that, 'dependant1', requiredPlus1);
            Rule.attach(that, 'dependant2', requiredPlus2);
            Rule.attach(that, 'dependant1a', dependant1Plus10);
            Rule.attach(that, 'dependant1b', dependant1Plus20);
            testAnInstance(that);
        });
        describe('on class instance', () => {
            class Something2 {}
            Rule.attach(Something2.prototype, 'a');
            Rule.attach(Something2.prototype, 'b', aPlus1);
            Rule.attach(Something2.prototype, 'c', bPlus1);
            Rule.attach(Something2.prototype, 'required', undefined);
            Rule.attach(Something2.prototype, 'dependant1', requiredPlus1);
            Rule.attach(Something2.prototype, 'dependant2', requiredPlus2);
            Rule.attach(Something2.prototype, 'dependant1a', dependant1Plus10);
            Rule.attach(Something2.prototype, 'dependant1b', dependant1Plus20);
            var that = new Something2();
            that.required = 5;
            testAnInstance(that);
        });
        it('does not track dependencies in callbacks', (done) => {
            function fetchFromDatabase(key, cb) {
                setTimeout(() => cb(null, key + 2), 10);
            }
            class Callbacks {
                a() { return 1; }
                b() { return 2; }
                noPromise(self) {
                    var a = self.a;
                    var container = [];
                    fetchFromDatabase(a, function (error, dbValue) {
                        if (error) throw error;
                        container[0] = dbValue + a + self.b;
                    });
                    return container;
                }
                wrongResult(self) { return self.noPromise[0]; }
                promiseButStillWrong(self) {
                    var a = self.a;
                    return new Promise(function (resolve, reject) {
                        fetchFromDatabase(a, function (error, dbValue) {
                            if (error) reject(error);
                            resolve(dbValue + a + self.b);
                        });
                    });
                }
                onlyTracksSome(self) { return self.promiseButStillWrong; }
                dbValue(self) {
                    return new Promise(function (resolve, reject) {
                        fetchFromDatabase(self.a, function (error, dbValue) {
                            if (error) reject(error);
                            resolve(dbValue);
                        });
                    });
                }
                computationOnDbValue(self) {
                    return self.dbValue + self.a + self.b;
                }
            }
            Rule.rulify(Callbacks.prototype);
            var that = new Callbacks();
            expect(() => that.wrongResult).toThrowError();
            Promise.all([that.onlyTracksSome, that.computationOnDbValue]).then(() => {
                expect(that.onlyTracksSome).toBe(6);
                expect(that.computationOnDbValue).toBe(6);
                that.a = 0;
                Promise.all([that.onlyTracksSome, that.computationOnDbValue]).then(() => {
                    expect(that.onlyTracksSome).toBe(4);
                    expect(that.computationOnDbValue).toBe(4);
                    that.b = 0;
                    Promise.all([that.onlyTracksSome, that.computationOnDbValue]).then(() => {
                        expect(that.onlyTracksSome).toBe(4); // Wrong answer!
                        expect(that.computationOnDbValue).toBe(2);
                        done();
                    });
                });
            });
        });
    });
    describe('execution time', () => {
        var seed = 0, data;
        function compute() { return Math.sqrt(Math.sqrt(Math.random())) + Math.sqrt(Math.sqrt(seed)); }
        class Thrasher { }
        Thrasher.prototype.computeMethod = compute;
        Rule.attach(Thrasher.prototype, 'computeRule', compute);
        function timeMethod(array) {
            var i, size = array.length, start = Date.now(), instance;
            for (i = 0; i < size; i++) {
                seed = array[i].computeMethod();
            }
            return Date.now() - start;
        }
        function timeRule(array) {
            var i, size = array.length, start = Date.now(), instance;
            for (i = 0; i < size; i++) {
                seed = array[i].computeRule;
            }
            return Date.now() - start;
        }
        beforeEach(() => {
            data = Array(100000);
            for (var i = 0; i < data.length; i++) { data[i] = new Thrasher(); }
            var t = [new Thrasher()];
            timeMethod(t);
            timeRule(t);
        });
        it('is within an order of magnitude of a normal method for first execution', () => {
            expect(timeRule(data)).toBeLessThan(25 * timeMethod(data));
        });
        it('is within normal method for subsequent execution', () => {
            timeMethod(data);
            timeRule(data);
            expect(timeRule(data)).toBeLessThan(10 * timeMethod(data));
        });
    });
    describe('with Promises', () => {
        var that = {};
        Rule.attach(that, 'explicitPromise', () => new Promise((resolve) => setTimeout(() => {
            resolve(3);
        }, 0)));
        it('resolves to the actual value when the promise resolves', (done) => {
            that.explicitPromise.then(() => {
                expect(that.explicitPromise).toBe(3);
                done();
            });
        });
        it('is still initially a promise that then becomes the value, if the rule is an immediately resolve promise', (done) => {
            Rule.attach(that, 'immediatePromise', () => Promise.resolve(3));
            that.immediatePromise.then(() => {
                expect(that.immediatePromise).toBe(3);
                done();
            });
        });
        it('is contagious to other rules that reference it', (done) => {
            Rule.attach(that, 'promisedA', () => Promise.resolve(3));
            Rule.attach(that, 'referenceA', (self) => self.promisedA + 1);
            that.referenceA.then((resolved) => {
                expect(resolved).toBe(4);
                expect(that.referenceA).toBe(4);
                expect(that.referenceA).toBe(4);                
                that.promisedA = 72;
                expect(that.referenceA).toBe(73);
                expect(that.referenceA.then).toBeUndefined();
                expect(that.referenceA).toBe(73);                
                that.promisedA = undefined;
                that.referenceA.then((resolved) => {
                    expect(resolved).toBe(4);
                    expect(that.referenceA).toBe(4);
                    expect(that.referenceA).toBe(4);                    
                    done();
                });
            });
        });
        it('propogates resolutions through chains', (done) => {
            Rule.attach(that, 'chainA', () => Promise.resolve(3));
            Rule.attach(that, 'chainB', (self) => self.chainA + 1);
            Rule.attach(that, 'chainC', (self) => self.chainB + 1);            
            that.chainC.then((resolved) => {
                expect(resolved).toBe(5);
                expect(that.chainC).toBe(5);
                done();
            });
        });                  
        it('propogates rejections through contagious chains', (done) => {
            var that = {};
            Rule.attach(that, 'chainA', () => Promise.reject(3));
            Rule.attach(that, 'chainB', (self) => self.chainA + 1);
            Rule.attach(that, 'chainC', (self) => self.chainB + 1);            
            that.chainC.catch((reason) => {
                expect(reason).toBe(3);
                done();
            });
        });
        it('can handle multiple promise references in a rule', function (done) {
            var that = {};
            Rule.attach(that, 'a', () => Promise.resolve(1));
            Rule.attach(that, 'b', self =>
                        new Promise(resolve => setTimeout(() => resolve(self.a + 1), 100)));
            Rule.attach(that, 'c', self =>
                        new Promise(resolve => setTimeout(() => resolve(self.a + 2), 100)));
            Rule.attach(that, 'd', () => Promise.resolve(0));            
            Rule.attach(that, 'e');
            that.e = Promise.resolve(0); // even explicitly set, not from method
            Rule.attach(that, 'f', self => self.a + self.b + self.c + self.d + self.e);
            that.f.then((f) => {
                expect(that.a).toBe(1);
                expect(that.b).toBe(2);
                expect(that.c).toBe(3);
                expect(that.d).toBe(0);
                expect(that.e).toBe(0);                
                expect(that.f).toBe(6);
                expect(f).toBe(6);                
                done();
            });
        });
        it('properly caches rules that were resolved promises', done => {
            var count = 0,
                data = Rule.rulify({
                    delayed: () => Promise.resolve(17),
                    referencing: self => { count++; return self.delayed; }
                });
            data.referencing.then(() => {
                expect(count).toBe(2);
                expect(data.referencing).toBe(17);
                expect(count).toBe(2);
                done();
            });
        });
        it('can refer to promise rule chains', done => {
            var data = Rule.rulify({
                a: () => Promise.resolve(1),
                b: self => Promise.resolve(self.a),
                c: self => Promise.resolve(self.b),
                d: self => self.a + self.b + self.c
            });
            data.d.then(d => {
                expect(d).toBe(3);
                done();
            });
        });
        it('when chained to other rulified objects with promises will resolve in a rule', done => {
            var data = Rule.rulify({
                a: () => Promise.resolve(Rule.rulify({
                    b: () => Promise.resolve(Rule.rulify({
                        c: Promise.resolve(17)
                    }))
                })),
                chainRule: self => self.a.b.c
            });
            data.chainRule.then(result => {
                expect(result).toBe(17);
                done();
            });
        });
        it('when chained to other rulified objects with promises will not resolve outside a rule', done => {
            var data = Rule.rulify({
                a: () => Promise.resolve(Rule.rulify({
                    b: () => Promise.resolve(Rule.rulify({
                        c: Promise.resolve(17)
                    }))
                }))
            });
            expect(() => data.a.b.c.then(() => "won't get here")).toThrowError();
            done();
        });
        it('does not attempt to treat promises as values within rules', done => {
            var history = [],
                data = Rule.rulify({
                    a: self => {
                        history.push('start a');
                        return new Promise(resolve => {
                            setTimeout(() => {
                                history.push('finish a');
                                resolve(1);
                            }, 100);
                        });
                    },
                    b: self => {
                        history.push('start b');
                        return new Promise(resolve => {
                            setTimeout(() => {
                                history.push('finish b');
                                resolve({c: 2});
                            }, 100);
                        });
                    },
                    d: self => {
                        history.push('start d');
                        return new Promise(resolve => {
                            setTimeout(() => {
                                history.push('finish d');
                                resolve(Rule.rulify({
                                    e: self => {
                                        history.push('start e');
                                        return new Promise(resolve => {
                                            setTimeout(() => {
                                                history.push('finish 3');
                                                resolve({f: 3});
                                            }, 100)
                                        });
                                    }
                                }));
                            });
                        });
                    },
                    z: self => {
                        history.push('start z');
                        const result = self.a + self.b.c + self.d.e.f;
                        history.push('finish z');
                        return result;
                    }
                });
            data.z.then(final => {
                expect(history).toEqual([
                    'start z',
                    'start a',
                    'finish a',
                    
                    'start z',
                    'start b',
                    'finish b'
                    ,
                    'start z',
                    'start d',
                    'finish d',
                    
                    'start z',
                    'start e',
                    'finish 3',
                    
                    'start z',
                    'finish z'
                ]);
                expect(final).toBe(data.z);
                expect(final).toBe(6);
                done();
            });
        });
    });
    describe('using this and self', () => {
        it('has the same for both by default, with choice being a matter of style', () => {
            var that = {};
            Rule.attach(that, 'functionThis', function () {
                return this;
            });
            Rule.attach(that, 'functionSelf', function (self) {
                return self;
            });
            expect(that.functionThis).toEqual(that);
            expect(that.functionSelf).toEqual(that);
        });
        it('still has this not defined within arrow functions, as in all javascript', () => {
            var that = {};
            Rule.attach(that, 'arrowThis', () => {
                return this;
            });
            Rule.attach(that, 'arrowSelf', (self) => {
                return self;
            });
            expect(that.arrowThis).not.toEqual(that);
            expect(that.arrowSelf).toEqual(that);
        });
        it('can be used in an entity/component system', () => {
            var componentA = {property: 16};
            var componentB = {property: 41};
            function addProperties(self) { return this.property + self.property; }
            Rule.attach(componentA, 'value', addProperties);
            Rule.attach(componentB, 'value', addProperties);            
            var entity = {
                property: 1,
                addComponent: function (name, component) {
                    // Rules will use this.entity (if defined) as the 'self' parameter.
                    component.entity = this;
                    this[name] = component;
                }
            };
            entity.addComponent('a', componentA);
            entity.addComponent('b', componentB);
            
            expect(entity.a.value).toEqual(17);
            expect(entity.b.value).toEqual(42);
        });
    });
    describe('only tracks Rules:', () => {
        it("does not track a ref'd var", () => {
            var a = 1, b = 2
            var pojo = {};
            Rule.attach(pojo, 'sum', () => a + b);
            expect(pojo.sum).toEqual(3);
            a = 2; // Not a Rule. Change not tracked.
            expect(pojo.sum).not.toEqual(4);
        });
        it("does not track a ref'd property", () => {
            var pojo = {a: 1, b: 2};
            Rule.attach(pojo, 'sum', self => self.a + self.b);
            expect(pojo.sum).toEqual(3);
            pojo.a = 2; // Not a Rule. Change not tracked.
            expect(pojo.sum).not.toEqual(4);
        });
        it("does not track a ref'd array cell", () => {
            var list = [1, 2],
                other = {}; // so as not to mess up list.length
            Rule.attach(other, 'sum', () => list.reduce((a, e) => a + e));
            expect(other.sum).toEqual(3);
            list[0] = 2; // Not a Rule. Change not tracked.
            expect(other.sum).not.toEqual(4);
        });
        it("tracks a ref'd rule", () => {
            var pojo = {a: 1, b: 2},
                other = {};
            Rule.rulify(pojo);
            Rule.attach(pojo, 'sum', self => self.a + self.b);
            expect(pojo.sum).toEqual(3);
            pojo.a = 2;
            expect(pojo.sum).toEqual(4);
        });
        it("tracks a rulified ref'd array cell", () => {
            var nakedList = [1, 2],
                list = Rule.rulify(nakedList),
                other = {};
            Rule.attach(other, 'sum', () => list.reduce((a, e) => a + e));
            expect(other.sum).toEqual(3);
            list[0] = 2;
            expect(other.sum).toEqual(4);
            list.push(3);
            // Recomputes because we track length as if it were a rule!
            expect(other.sum).toEqual(7);
        });
        it("supports a recursive idiom", () => {
            var component = Rule.rulify({
                list: [1, 2],
                sum: self => self.list.reduce((a, e) => a + e),
                plus1: self => self.list.map(e => e + 1)
            });
            expect(component.sum).toEqual(3);
            expect(component.plus1[0]).toEqual(2);
            component.list[0] = 2;
            expect(component.sum).toEqual(4);
            expect(component.plus1[0]).toEqual(3);
            expect(component.plus1.length).toEqual(2);            
            component.list.push(3);
            expect(component.sum).toEqual(7);
            expect(component.plus1.length).toEqual(3);
        });
        it("tracks only what has changed in an array", () => {
            function ref(index) { counts[index]++; return component.list[index]; }
            var counts = [0, 0, 0],
                component = Rule.rulify({
                    list: ['a', 'b', 'c'],
                    ref0: () => ref(0),
                    ref1: () => ref(1),
                    ref2: () => ref(2)
                });
            expect(component.ref0).toBe('a');
            expect(component.ref1).toBe('b');
            expect(component.ref2).toBe('c');
            expect(counts.every(e => e === 1)).toBeTruthy();
            component.list.splice(1, 0, 'i');
            expect(component.ref0).toBe('a');
            expect(counts[0]).toBe(1);
            expect(component.list[1]).toBe('i');
            expect(component.list[3]).toBe('c');            
            expect(component.ref1).toBe('i'); 
            expect(counts[1]).toBe(2);
            expect(component.ref2).toBe('b'); 
            expect(counts[2]).toBe(2);            
        });
    });
});