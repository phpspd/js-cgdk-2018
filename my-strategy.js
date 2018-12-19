/**
 * Created by Quake on 18.12.2018
 */
"use strict";

module.exports.getInstance = function () {
    //private strategy variables here;
    var __r;

    /**
     * Основной метод стратегии. Вызывается каждый тик.
     *
     * @param robot  Информация о вашем роботе.
     * @param rules Правила.
     * @param game  Различные игровые константы.
     * @param action  Результатом работы метода является изменение полей данного объекта.
     */
    var initialized;
    var robot, rules, game, action;

    var moveFunction = function (robot, rules, game, action) {
        if (!initialized) {
            initializeStrategy(rules, game);
            initialized = true;
        }
        initializeTick(robot, rules, game, action);

        moveFunc();
    };

    /**
     * Инциализируем стратегию.
     * <p>
     * Для этих целей обычно можно использовать конструктор, однако в данном случае мы хотим инициализировать генератор
     * случайных чисел значением, полученным от симулятора игры.
     */
    var initializeStrategy = function (world, game) {
        __r = game.randomSeed;
    };
    /**
     * Сохраняем все входные данные в полях замыкания для упрощения доступа к ним.
     */
    var initializeTick = function (robot_, rules_, game_, action_) {
        robot = robot_;
        rules = rules_;
        game = game_;
        action = action_;


    };

    /**
     * Основная логика нашей стратегии.
     */
    var moveFunc = function () {
        const BALL_RADIUS = 2;
        const ROBOT_MAX_RADIUS = 1.05;
        const MAX_ENTITY_SPEED = 100.0;
        const ROBOT_MAX_GROUND_SPEED = 30.0;
        const ROBOT_MAX_JUMP_SPEED = 15.0;
        let me = robot;

        if (!me.touch) {
            action.target_velocity_x = 0;
            action.target_velocity_y = -100;
            action.target_velocity_z = 0;
            action.jump_speed = 0;
            action.use_nitro = true;
        }

        // Если при прыжке произойдет столкновение с мячом, и мы находимся
        // с той же стороны от мяча, что и наши ворота, прыгнем, тем самым
        // ударив по мячу сильнее в сторону противника
        let jump = (me.x - game.ball.x) * (me.x - game.ball.x)
            + (me.y - game.ball.y) * (me.y - game.ball.y)
            + (me.z - game.ball.z) * (me.z - game.ball.z)
            < (BALL_RADIUS + ROBOT_MAX_RADIUS) * (BALL_RADIUS + ROBOT_MAX_RADIUS)
            && me.z < game.ball.z;

        // Так как роботов несколько, определим нашу роль - защитник, или нападающий
        // Нападающим будем в том случае, если есть дружественный робот,
        // находящийся ближе к нашим воротам
        let is_attacker = game.robots.length == 2;
        for (let robot of game.robots) {
            if (robot.is_teammate && robot.id != me.id) {
                if (robot.z <= me.z) {
                    is_attacker = true;
                }
            }
        }
        
        if (is_attacker) {
            // Стратегия нападающего:
            // Просимулирем примерное положение мяча в следующие 10 секунд, с точностью 0.1 секунда
            for (let i = 0; i < 100; ++i) {
                let t = i * 0.1;
                let ball_pos = {
                    x: game.ball.x + game.ball.velocity_x * t,
                    y: game.ball.y + game.ball.velocity_y * t,
                    z: game.ball.z + game.ball.velocity_z * t,
                }
                // Если мяч не вылетит за пределы арены
                // (произойдет столкновение со стеной, которое мы не рассматриваем),
                // и при этом мяч будет находится ближе к вражеским воротам, чем робот,
                if (
                    ball_pos.z > me.z
                    && Math.abs(ball_pos.x) < rules.arena.width / 2
                    && Math.abs(ball_pos.z) < rules.arena.depth / 2
                ) {
                    // Посчитаем, с какой скоростью робот должен бежать,
                    // Чтобы прийти туда же, где будет мяч, в то же самое время
                    let distance = Math.sqrt((ball_pos.x - me.x)*(ball_pos.x - me.x) + (ball_pos.z - me.z)*(ball_pos.z - me.z));
                    let need_speed = distance / t;
                    if (
                        0.5 * ROBOT_MAX_GROUND_SPEED < need_speed
                        && need_speed < ROBOT_MAX_GROUND_SPEED
                    ) {
                        // То это и будет наше текущее действие
                        action.target_velocity_x = need_speed * (ball_pos.x - me.x) / distance;
                        action.target_velocity_y = 0;
                        action.target_velocity_z = need_speed * (ball_pos.z - me.z) / distance;
                        action.jump_speed = jump ? ROBOT_MAX_JUMP_SPEED : 0;
                        action.use_nitro = false;
                        
                        return;
                    }
                }
            }

            let pos = {
                x: game.ball.x,
                y: 0,
                z: game.ball.z - BALL_RADIUS - ROBOT_MAX_RADIUS * 4
            }
            let distance = Math.sqrt((pos.x - me.x)*(pos.x - me.x) + (pos.z - me.z)*(pos.z - me.z));
            action.target_velocity_x = ROBOT_MAX_GROUND_SPEED * (pos.x - me.x) / distance;
            action.target_velocity_y = 0;
            action.target_velocity_z = ROBOT_MAX_GROUND_SPEED * (pos.z - me.z) / distance;
            action.jump_speed = jump ? ROBOT_MAX_JUMP_SPEED : 0;
            action.use_nitro = false;

            return;
        }

        // Стратегия защитника (или атакующего, не нашедшего хорошего момента для удара):
        // Будем стоять посередине наших ворот
        let target_pos = {
            x: 0,
            y: 0,
            z: - rules.arena.depth / 2,
        };
        if (game.ball.velocity_z < -0.00001) {
            // Найдем время и место, в котором мяч пересечет линию ворот
            let t = (target_pos.z - game.ball.z) / game.ball.velocity_z;
            let x = game.ball.x + game.ball.velocity_x * t;
            // Если это место - внутри воротa
            if (Math.abs(x) < rules.arena.goal_width / 2) {
                // То пойдем защищать его
                target_pos.x = x;
            }
        }

        // Установка нужных полей для желаемого действия
        let distance = Math.sqrt((target_pos.x - me.x)*(target_pos.x - me.x) + (target_pos.z - me.z)*(target_pos.z - me.z));
        action.target_velocity_x = ROBOT_MAX_GROUND_SPEED * (target_pos.x - me.x) / distance;
        action.target_velocity_y = 0;
        action.target_velocity_z = ROBOT_MAX_GROUND_SPEED * (target_pos.z - me.z) / distance;
        action.jump_speed = jump ? ROBOT_MAX_JUMP_SPEED : 0;
        action.use_nitro = false;

        return;
    }

    return moveFunction; //возвращаем функцию move, чтобы runner мог ее вызывать
};