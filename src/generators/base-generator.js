export class BaseGenerator {
  constructor(target) {
    this.target = target;
  }

  validate(spec) {
    throw new Error(`${this.constructor.name}.validate(spec) must be implemented`);
  }

  generate(spec) {
    throw new Error(`${this.constructor.name}.generate(spec) must be implemented`);
  }

  get artifactManifest() {
    throw new Error(`${this.constructor.name}.artifactManifest must be implemented`);
  }
}
