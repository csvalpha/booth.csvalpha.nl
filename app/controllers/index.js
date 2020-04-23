import Controller from '@ember/controller';
import {action} from '@ember/object';
import { computed } from '@ember/object';

export default class IndexController extends Controller {
  constructor() {
    super(...arguments);
    this.boothIds = [1,2,3,4,5,6,7,8,9,10];
  }
}
