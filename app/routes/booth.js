import Route from '@ember/routing/route';
import { action } from '@ember/object';


export default class BoothRoute extends Route {
  @action
  willTransition(transition) {
    this.controller.send("leaveRoom", "test")
  }

  @action
  didTransition(transition) {
    this.controller.send("joinRoom", "test")
  }
}
