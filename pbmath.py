import random


def display_separator():
    print("-" * 24)


def get_user_solution(problem):
    print("Enter your answer")
    print(problem, end="")
    result = int(input(" = "))
    return result


def check_solution(user_solution, solution, count):
    if user_solution == solution:
        count = count + 1
        print("Correct.")
        return count
    else:
        print("Incorrect.")
        return count


def menu_option(index, count):
    number_one = 6
    number_two = random.randrange(1, 9)

    if index is 3:
        problem = str(number_one) + " * " + str(number_two)
        solution = number_one * number_two
        user_solution = get_user_solution(problem)
        count = check_solution(user_solution, solution, count)
        return count
    else:
        problem = str(number_one) + " // " + str(number_two)
        solution = number_one // number_two
        user_solution = get_user_solution(problem)
        count = check_solution(user_solution, solution, count)
        return count


def display_result(total, correct):
    if total > 0:
        result = correct / total
        percentage = round((result * 100), 2)
    if total == 0:
        percentage = 0
    print("You answered", total, "questions with", correct, "correct.")
    print("Your score is ", percentage, "%. Thank you.", sep="")


def main():
    display_separator()
    option = 3
    total = 0
    correct = 0
    while total < 3:
        total = total + 1
        correct = menu_option(3, correct)
        option = 3

    print("You're done!.")
    display_separator()
    display_result(total, correct)


main()
