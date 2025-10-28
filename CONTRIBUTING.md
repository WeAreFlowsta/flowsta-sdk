# Contributing to Flowsta SDK

Thank you for your interest in contributing to the Flowsta SDK! We welcome contributions from the community.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How to Contribute

### Reporting Bugs

1. **Check existing issues** to see if the bug has already been reported
2. **Create a new issue** with a clear title and description
3. **Include**:
   - Steps to reproduce the bug
   - Expected behavior
   - Actual behavior
   - Screenshots (if applicable)
   - Browser/environment details

### Suggesting Features

1. **Check existing feature requests** to avoid duplicates
2. **Create a new issue** with the `enhancement` label
3. **Describe**:
   - The problem you're trying to solve
   - Your proposed solution
   - Alternative solutions you've considered
   - Use cases and benefits

### Contributing Code

1. **Fork the repository**
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**:
   - Follow the existing code style
   - Write clear, concise commit messages
   - Add tests for new features
   - Update documentation as needed
4. **Run tests**:
   ```bash
   npm install
   npm test
   ```
5. **Submit a pull request**:
   - Reference any related issues
   - Describe your changes clearly
   - Include screenshots for UI changes

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/WeAreFlowsta/flowsta-sdk.git
cd flowsta-sdk/sdk-monorepo

# Install dependencies
npm install

# Start development server
cd packages/widgets
npm run dev
```

### Project Structure

```
sdk-monorepo/
├── packages/
│   └── widgets/          # Auth widgets package
│       ├── src/          # Source code
│       ├── tests/        # Unit and E2E tests
│       ├── docs/         # Documentation
│       └── examples/     # Example implementations
└── package.json          # Monorepo configuration
```

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

### Building

```bash
# Build all packages
npm run build

# Build widgets package only
cd packages/widgets
npm run build
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Provide proper type definitions
- Avoid using `any` types
- Document complex types

### Testing

- Write unit tests for all new features
- Maintain test coverage above 90%
- Use descriptive test names
- Mock external dependencies

### Documentation

- Update README files for significant changes
- Add JSDoc comments for public APIs
- Include code examples in documentation
- Keep documentation up-to-date with code changes

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions or modifications
- `refactor:` Code refactoring
- `chore:` Build process or tooling changes

Examples:
```
feat: add email verification widget
fix: resolve recovery phrase validation issue
docs: update widget integration guide
test: add unit tests for security dashboard
```

## Pull Request Process

1. **Ensure all tests pass** before submitting
2. **Update documentation** for any API changes
3. **Request review** from maintainers
4. **Address feedback** promptly
5. **Squash commits** if requested before merging

## Questions?

- Check the [documentation](https://flowsta.com/docs)
- Open a [discussion](https://github.com/WeAreFlowsta/flowsta-sdk/discussions)
- Email us at [hello@flowsta.com](mailto:hello@flowsta.com)

## License

By contributing to Flowsta SDK, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing! 🎉

