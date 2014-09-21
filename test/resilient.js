var expect = chai.expect

describe('Resilient', function () {

  it('should expose the resilient object as global', function () {
    expect(resilient).to.be.a('function')
  })

})
